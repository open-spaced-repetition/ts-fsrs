export type RunnerLogLevel = 'debug' | 'error' | 'info' | 'log' | 'warn'

export type RunnerLog = {
  /** When the Worker wrote the line, as epoch milliseconds. */
  readonly at: number
  readonly level: RunnerLogLevel
  readonly text: string
}

export type CodeRunRequest = {
  readonly code: string
  readonly id: number
  readonly type: 'run'
}

export type CsvTrainingRequest = {
  readonly csvText: string
  readonly enableShortTerm: boolean
  readonly id: number
  readonly nextDayStartsAt: number
  readonly timezone: string
  readonly type: 'train-csv'
}

export type RunnerRequest = CodeRunRequest | CsvTrainingRequest

export type CodeRunResponse =
  | {
      readonly durationMs: number
      readonly id: number
      readonly logs: readonly RunnerLog[]
      readonly ok: true
      readonly type: 'run-result'
    }
  | {
      readonly error: string
      readonly id: number
      readonly logs: readonly RunnerLog[]
      readonly ok: false
      readonly type: 'run-result'
    }

export type CsvTrainingResponse =
  | {
      readonly durationMs: number
      readonly id: number
      readonly itemCount: number
      readonly ok: true
      readonly type: 'training-result'
      readonly weights: readonly number[]
    }
  | {
      readonly error: string
      readonly id: number
      readonly ok: false
      readonly type: 'training-result'
    }

export type RunnerResponse = CodeRunResponse | CsvTrainingResponse

/**
 * A single console line, posted while the run is still in progress so a slow
 * example reports what it is doing instead of staying silent until it ends.
 */
export type RunLogMessage = {
  readonly id: number
  readonly log: RunnerLog
  readonly type: 'run-log'
}

export type TrainingProgress = {
  readonly current: number
  readonly id: number
  readonly total: number
  readonly type: 'training-progress'
}

export type RunnerMessage =
  | RunnerResponse
  | RunLogMessage
  | TrainingProgress
  | {
      readonly type: 'ready'
    }
