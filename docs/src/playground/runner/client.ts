import type {
  CodeRunResponse,
  CsvTrainingResponse,
  RunnerLog,
  RunnerMessage,
  RunnerRequest,
  RunnerResponse,
  TrainingProgress,
} from './protocol'
import {
  getRevlogTrainingConfigErrorMessage,
  validateRevlogTrainingConfig,
} from './revlog-config'

type PendingRun = {
  readonly onLog?: (log: RunnerLog) => void
  readonly onProgress?: (progress: TrainingProgress) => void
  readonly reject: (reason: Error) => void
  readonly request: RunnerRequest
  readonly resolve: (response: RunnerResponse) => void
}

const RUN_TIMEOUT_MS = 45_000
let nextRequestId = 1
let runner: Worker | undefined
let runnerReady = false
const pendingRuns = new Map<number, PendingRun>()
let runnerLeaseCount = 0
let runnerTimeout: number | undefined

function stopRunner(reason: Error): void {
  runner?.terminate()
  runner = undefined
  runnerReady = false
  clearTimeout(runnerTimeout)
  runnerTimeout = undefined
  for (const pending of pendingRuns.values()) {
    pending.reject(reason)
  }
  pendingRuns.clear()
}

export function acquirePlaygroundRunnerLease(): () => void {
  runnerLeaseCount += 1
  let released = false
  return () => {
    if (released) return
    released = true
    runnerLeaseCount -= 1
    if (runnerLeaseCount === 0) {
      stopRunner(new Error('The playground Worker has no active consumers.'))
    }
  }
}

function getRunner(): Worker {
  if (runner) return runner

  const nextRunner = new Worker(new URL('./worker.ts', import.meta.url), {
    name: 'ts-fsrs-playground',
    type: 'module',
  })
  nextRunner.addEventListener(
    'message',
    (event: MessageEvent<RunnerMessage>) => {
      if (runner !== nextRunner) return
      const message = event.data
      if (message.type === 'ready') {
        runnerReady = true
        for (const pending of pendingRuns.values()) {
          nextRunner.postMessage(pending.request)
        }
        armRunnerTimeout()
        return
      }
      const pending = pendingRuns.get(message.id)
      if (!pending) return
      // Progress and streamed logs prove the run is alive, so they postpone
      // the inactivity timeout the same way a result does.
      if (message.type === 'training-progress') {
        armRunnerTimeout()
        pending.onProgress?.(message)
        return
      }
      if (message.type === 'run-log') {
        armRunnerTimeout()
        pending.onLog?.(message.log)
        return
      }
      pendingRuns.delete(message.id)
      pending.resolve(message)
      if (pendingRuns.size === 0) {
        clearTimeout(runnerTimeout)
        runnerTimeout = undefined
      } else {
        armRunnerTimeout()
      }
    }
  )
  nextRunner.addEventListener('error', (event) => {
    if (runner !== nextRunner) return
    stopRunner(new Error(event.message || 'The playground Worker crashed.'))
  })
  runner = nextRunner
  return nextRunner
}

function armRunnerTimeout(): void {
  clearTimeout(runnerTimeout)
  runnerTimeout = window.setTimeout(() => {
    stopRunner(
      new Error(
        `The playground Worker was inactive for ${RUN_TIMEOUT_MS / 1000} seconds and was terminated.`
      )
    )
  }, RUN_TIMEOUT_MS)
}

function sendRequest(pending: PendingRun, id: number): void {
  pendingRuns.set(id, pending)
  let activeRunner: Worker
  try {
    activeRunner = getRunner()
  } catch (error) {
    pendingRuns.delete(id)
    pending.reject(error instanceof Error ? error : new Error(String(error)))
    return
  }
  if (runnerReady) activeRunner.postMessage(pending.request)
  armRunnerTimeout()
}

export function runInPlaygroundWorker(
  code: string,
  onLog?: (log: RunnerLog) => void
): Promise<CodeRunResponse> {
  const id = nextRequestId++
  const request = { code, id, type: 'run' } as const
  const { promise, reject, resolve } = Promise.withResolvers<CodeRunResponse>()
  sendRequest(
    {
      onLog,
      reject,
      request,
      resolve(response) {
        if (response.type === 'run-result') resolve(response)
        else
          reject(new Error('The playground Worker returned the wrong result.'))
      },
    },
    id
  )
  return promise
}

export type RevlogTrainingRequest = {
  readonly csvText: string
  readonly enableShortTerm: boolean
  readonly nextDayStartsAt: number
  readonly onProgress?: (progress: TrainingProgress) => void
  readonly timezone: string
}

export function trainRevlogCsvInPlaygroundWorker({
  csvText,
  enableShortTerm,
  nextDayStartsAt,
  onProgress,
  timezone,
}: RevlogTrainingRequest): Promise<CsvTrainingResponse> {
  const validation = validateRevlogTrainingConfig(timezone, nextDayStartsAt)
  if (!validation.ok) {
    return Promise.reject(
      new Error(getRevlogTrainingConfigErrorMessage(validation.error))
    )
  }

  const id = nextRequestId++
  const request = {
    csvText,
    enableShortTerm,
    id,
    ...validation.config,
    type: 'train-csv',
  } as const
  const { promise, reject, resolve } =
    Promise.withResolvers<CsvTrainingResponse>()
  sendRequest(
    {
      onProgress,
      reject,
      request,
      resolve(response) {
        if (response.type === 'training-result') resolve(response)
        else
          reject(new Error('The playground Worker returned the wrong result.'))
      },
    },
    id
  )
  return promise
}
