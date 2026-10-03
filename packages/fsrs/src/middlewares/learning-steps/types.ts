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

export type LearningStepsMiddlewareConfigInput = LearningStepsConfig & {
  readonly enableShortTerm: boolean
  /**
   * Minimum days for a review card. Shorter intervals stay in (re)learning;
   * with steps, graduation and passing reviews wait at least this long.
   * Defaults to 1.
   */
  readonly graduatingInterval?: number
  /**
   * Let longer model intervals override the current step. Again is capped at
   * the graduating interval. Defaults to false.
   */
  readonly allowModelOverride?: boolean
}

export type LearningStepsMiddlewareConfig = LearningStepsConfig & {
  readonly enableShortTerm: boolean
  readonly graduatingInterval: number
  readonly allowModelOverride: boolean
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
