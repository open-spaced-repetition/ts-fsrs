import type { Grade, State } from '@open-spaced-repetition/srs-kit'

export type TimeUnit = 'm' | 'h' | 'd'
export type StepUnit = `${number}${TimeUnit}`

export type LearningStepFields = {
  readonly learningStep: number
}

export type LearningStepFieldsInput = {
  readonly learningStep?: number
}

export type LearningStepsConfig = {
  readonly learningSteps: readonly StepUnit[]
  readonly relearningSteps: readonly StepUnit[]
}

export type LearningStepsMiddlewareConfig = LearningStepsConfig & {
  readonly enableShortTerm: boolean
}

export type LearningStepSchedule = {
  readonly scheduledMinutes: number
  readonly nextStep: number
}

export type LearningStepsResult = {
  [K in Grade]?: LearningStepSchedule
}

export type LearningStepsResolver = (
  config: LearningStepsConfig,
  state: State,
  learningStep: number
) => LearningStepsResult
