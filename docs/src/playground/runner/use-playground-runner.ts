import { useCallback, useEffect, useRef, useState } from 'react'
import { acquirePlaygroundRunnerLease } from './client'
import type { CodeRunResponse, RunnerLog } from './protocol'

export type RunState = 'idle' | 'compiling' | 'running'

export type PlaygroundRunner = {
  durationMs: number | undefined
  error: string
  logs: readonly RunnerLog[]
  state: RunState
  clear(): void
  run(source: string): Promise<void>
}

type RunUpdate =
  | { readonly kind: 'running' }
  | { readonly kind: 'finished'; readonly response: CodeRunResponse }

/**
 * Compiles `source` and executes it in the playground Worker. Yielding between
 * the stages lets the caller abandon a superseded run at a single checkpoint
 * instead of testing for staleness after every step. Both stages are imported
 * on demand so the TypeScript compiler and the Worker client stay out of the
 * initial bundle.
 *
 * Console lines arrive while the run is still executing, so they reach the
 * caller through `onLog` rather than the yielded stages.
 */
async function* runPipeline(
  source: string,
  onLog: (log: RunnerLog) => void
): AsyncGenerator<RunUpdate> {
  const { compileTypeScript } = await import('../editor/monaco')
  const compiled = await compileTypeScript(source)
  yield { kind: 'running' }
  const { runInPlaygroundWorker } = await import('./client')
  const response = await runInPlaygroundWorker(compiled, onLog)
  yield { kind: 'finished', response }
}

/** Runs playground code and holds the transcript of the newest run. */
export function usePlaygroundRunner(): PlaygroundRunner {
  const generationRef = useRef(0)
  const [logs, setLogs] = useState<readonly RunnerLog[]>([])
  const [error, setError] = useState('')
  const [state, setState] = useState<RunState>('idle')
  const [durationMs, setDurationMs] = useState<number>()

  useEffect(() => {
    const releaseRunner = acquirePlaygroundRunnerLease()
    return () => {
      generationRef.current += 1
      releaseRunner()
    }
  }, [])

  const clear = useCallback(() => {
    setLogs([])
    setError('')
    setDurationMs(undefined)
  }, [])

  const run = useCallback(async (source: string) => {
    const generation = ++generationRef.current
    const isCurrentRun = () => generationRef.current === generation

    setLogs([])
    setError('')
    setDurationMs(undefined)
    setState('compiling')
    const appendLog = (log: RunnerLog) => {
      if (isCurrentRun()) setLogs((previous) => [...previous, log])
    }
    try {
      for await (const update of runPipeline(source, appendLog)) {
        // An unmount or a newer run superseded this one; leaving the loop
        // closes the pipeline and drops whatever it produced.
        if (!isCurrentRun()) return
        if (update.kind === 'running') {
          setState('running')
          continue
        }
        const { response } = update
        // The response repeats every streamed line, so replacing rather than
        // appending keeps the transcript free of duplicates.
        setLogs(response.logs)
        if (response.ok) {
          setDurationMs(response.durationMs)
        } else {
          setError(response.error)
        }
      }
    } catch (error) {
      if (isCurrentRun()) {
        setError(
          error instanceof Error
            ? (error.stack ?? error.message)
            : String(error)
        )
      }
    } finally {
      if (isCurrentRun()) setState('idle')
    }
  }, [])

  return { durationMs, error, logs, state, clear, run }
}
