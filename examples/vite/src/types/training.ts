// Shared types for FSRS training functionality

export interface OptimizationResult {
  enableShortTerm: boolean
  parameters: number[]
  progress: string
  completed: boolean
}

export interface TrainingStats {
  parseTime: string
  trainingTime: string
  fsrsItemsCount: number
}
