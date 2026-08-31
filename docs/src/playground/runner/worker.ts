/// <reference lib="webworker" />

import * as binding from '@open-spaced-repetition/binding-wasm32-wasip1'
import * as tsFsrs from 'ts-fsrs'
import * as tsFsrsMiddlewares from 'ts-fsrs/middlewares'
import * as tsFsrsFsrs3 from 'ts-fsrs/models/fsrs-3'
import * as tsFsrsFsrs4 from 'ts-fsrs/models/fsrs-4'
import * as tsFsrsFsrs4dot5 from 'ts-fsrs/models/fsrs-4dot5'
import * as tsFsrsFsrs5 from 'ts-fsrs/models/fsrs-5'
import * as tsFsrsFsrs6 from 'ts-fsrs/models/fsrs-6'
import * as tsFsrsReschedule from 'ts-fsrs/reschedule'
import { formatConsoleArguments } from './format-console'
import type {
  CodeRunRequest,
  CodeRunResponse,
  CsvTrainingRequest,
  CsvTrainingResponse,
  RunnerLog,
  RunnerLogLevel,
  RunnerRequest,
} from './protocol'
import { trainRevlogCsv } from './revlog-training'

type AsyncExecutor = (...values: unknown[]) => Promise<unknown>
type AsyncFunctionConstructor = new (
  ...parametersAndBody: string[]
) => AsyncExecutor

const AsyncFunction = Object.getPrototypeOf(
  async function playgroundExecutor() {}
).constructor as AsyncFunctionConstructor
const workerScope = globalThis as unknown as DedicatedWorkerGlobalScope
// Playground code imports the specifiers an application would install, and every
// subpath the packages export is mapped, so anything the typed editor offers as
// a completion also resolves when the code runs. The wasm32-wasip1 build backs
// the binding because it is the artifact that runs in a browser Worker;
// applications resolve their own platform build.
const runtimeModules: Readonly<Record<string, unknown>> = {
  '@open-spaced-repetition/binding': binding,
  'ts-fsrs': tsFsrs,
  'ts-fsrs/middlewares': tsFsrsMiddlewares,
  'ts-fsrs/models/fsrs-3': tsFsrsFsrs3,
  'ts-fsrs/models/fsrs-4': tsFsrsFsrs4,
  'ts-fsrs/models/fsrs-4dot5': tsFsrsFsrs4dot5,
  'ts-fsrs/models/fsrs-5': tsFsrsFsrs5,
  'ts-fsrs/models/fsrs-6': tsFsrsFsrs6,
  'ts-fsrs/reschedule': tsFsrsReschedule,
}

function requireModule(specifier: string): unknown {
  if (Object.hasOwn(runtimeModules, specifier)) return runtimeModules[specifier]
  throw new Error(`Unsupported playground import: ${specifier}`)
}

function createConsole(logs: RunnerLog[], id: number) {
  const write =
    (level: RunnerLogLevel) =>
    (...values: unknown[]) => {
      const log = {
        at: Date.now(),
        level,
        text: formatConsoleArguments(values),
      }
      logs.push(log)
      // Posting each line as it is written lets the page render a long run's
      // output while it happens; the final response still carries them all.
      workerScope.postMessage({ id, log, type: 'run-log' })
    }
  return {
    debug: write('debug'),
    error: write('error'),
    info: write('info'),
    log: write('log'),
    warn: write('warn'),
  }
}

async function execute(request: CodeRunRequest): Promise<void> {
  const logs: RunnerLog[] = []
  const startedAt = performance.now()
  try {
    const module = { exports: {} }
    const executor = new AsyncFunction(
      'require',
      'console',
      'exports',
      'module',
      `${request.code}\n//# sourceURL=ts-fsrs-playground.js`
    )
    await executor(
      requireModule,
      createConsole(logs, request.id),
      module.exports,
      module
    )
    const response: CodeRunResponse = {
      durationMs: performance.now() - startedAt,
      id: request.id,
      logs,
      ok: true,
      type: 'run-result',
    }
    workerScope.postMessage(response)
  } catch (error) {
    const response: CodeRunResponse = {
      error:
        error instanceof Error ? (error.stack ?? error.message) : String(error),
      id: request.id,
      logs,
      ok: false,
      type: 'run-result',
    }
    workerScope.postMessage(response)
  }
}

async function handleTraining(request: CsvTrainingRequest): Promise<void> {
  const startedAt = performance.now()
  try {
    const result = await trainRevlogCsv(request.csvText, {
      enableShortTerm: request.enableShortTerm,
      nextDayStartsAt: request.nextDayStartsAt,
      onProgress(current, total) {
        workerScope.postMessage({
          current,
          id: request.id,
          total,
          type: 'training-progress',
        })
      },
      timezone: request.timezone,
    })
    const response: CsvTrainingResponse = {
      durationMs: performance.now() - startedAt,
      id: request.id,
      itemCount: result.itemCount,
      ok: true,
      type: 'training-result',
      weights: result.weights,
    }
    workerScope.postMessage(response)
  } catch (error) {
    const response: CsvTrainingResponse = {
      error: error instanceof Error ? error.message : String(error),
      id: request.id,
      ok: false,
      type: 'training-result',
    }
    workerScope.postMessage(response)
  }
}

workerScope.addEventListener(
  'message',
  (event: MessageEvent<RunnerRequest>) => {
    if (event.data.type === 'run') void execute(event.data)
    else void handleTraining(event.data)
  }
)
workerScope.postMessage({ type: 'ready' })
