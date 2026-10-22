import type { ComputeParametersOptions } from '@open-spaced-repetition/binding'

export type TrainingModel = NonNullable<
  ComputeParametersOptions['modelVersion']
>

// Shared types for FSRS training functionality

export interface OptimizationResult {
  modelVersion: TrainingModel
  enableSchedPenalties: boolean
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
