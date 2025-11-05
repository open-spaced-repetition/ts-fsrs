// Shared types for FSRS training functionality

export interface OptimizationResult {
  enableShortTerm: boolean
  parameters: number[]
  progress: string
  completed: boolean
}

export interface TrainingProgress {
  current: number
  total: number
}

export interface TrainingConfig {
  enableShortTerm: boolean
  numRelearningSteps: number
  timezone?: string
}

export interface TrainingStats {
  parseTime: string
  trainingTime: string
  fsrsItemsCount: number
}

// SSE Message types
export type SSEMessage =
  | SSEStatusMessage
  | SSEParseCompleteMessage
  | SSETrainingStartMessage
  | SSEProgressMessage
  | SSETrainingCompleteMessage
  | SSECompleteMessage
  | SSEErrorMessage

export interface SSEStatusMessage {
  type: 'status'
  message: string
}

export interface SSEParseCompleteMessage {
  type: 'parse_complete'
  parseTime: string
  fsrsItemsCount: number
}

export interface SSETrainingStartMessage {
  type: 'training_start'
  enableShortTerm: boolean
}

export interface SSEProgressMessage {
  type: 'progress'
  enableShortTerm: boolean
  current: number
  total: number
  progress: string
}

export interface SSETrainingCompleteMessage {
  type: 'training_complete'
  enableShortTerm: boolean
  parameters: number[]
}

export interface SSECompleteMessage {
  type: 'complete'
  stats: TrainingStats
  results: OptimizationResult[]
}

export interface SSEErrorMessage {
  type: 'error'
  message: string
}
