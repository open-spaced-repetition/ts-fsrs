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
