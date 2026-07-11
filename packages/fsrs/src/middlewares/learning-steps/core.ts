import { Rating, State } from '@open-spaced-repetition/srs-kit'
import { FSRSValidationError } from '../../error.js'
import type {
  LearningStepsConfig,
  LearningStepsResolver,
  LearningStepsResult,
  StepUnit,
} from './types.js'

const DECIMAL_PATTERN = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/

export const ConvertStepUnitToMinutes = (step: StepUnit): number => {
  if (typeof step !== 'string' || step.length < 2) {
    throw new FSRSValidationError(`Invalid step value: ${step}`)
  }

  const unit = step.slice(-1)
  const numericPart = step.slice(0, -1)
  if (!DECIMAL_PATTERN.test(numericPart)) {
    throw new FSRSValidationError(`Invalid step value: ${step}`)
  }

  const value = Number(numericPart)
  if (!Number.isFinite(value)) {
    throw new FSRSValidationError(`Invalid step value: ${step}`)
  }

  switch (unit) {
    case 'm':
      return value
    case 'h':
      return value * 60
    case 'd':
      return value * 1440
    default:
      throw new FSRSValidationError(
        `Invalid step unit: ${step}, expected m/h/d`
      )
  }
}

/**
 * Calculates the grade-specific schedule for the current learning step.
 *
 * The focused config keeps this core independent from the legacy
 * `FSRSParameters` shape so it can also drive the scheduler middleware.
 */
export const calculateLearningSteps: LearningStepsResolver = (
  config: LearningStepsConfig,
  state,
  learningStep
): LearningStepsResult => {
  const steps =
    state === State.Relearning || state === State.Review
      ? config.relearningSteps
      : config.learningSteps
  const stepsLength = steps.length
  if (stepsLength === 0 || learningStep >= stepsLength) return {}

  const learningStepUnit = steps[Math.max(0, learningStep)]

  if (state === State.Review) {
    return {
      [Rating.Again]: {
        scheduledMinutes: ConvertStepUnitToMinutes(learningStepUnit),
        nextStep: 0,
      },
    }
  }

  const firstMinutes = ConvertStepUnitToMinutes(steps[0])
  const secondMinutes =
    stepsLength > 1 ? ConvertStepUnitToMinutes(steps[1]) : undefined
  const hardMinutes =
    secondMinutes === undefined
      ? Math.round(firstMinutes * 1.5)
      : Math.round((firstMinutes + secondMinutes) / 2)
  const result: LearningStepsResult = {
    [Rating.Again]: {
      scheduledMinutes: firstMinutes,
      nextStep: 0,
    },
    [Rating.Hard]: {
      scheduledMinutes: hardMinutes,
      nextStep: learningStep,
    },
  }

  const nextStepUnit = steps[learningStep + 1]
  if (nextStepUnit) {
    const nextMinutes =
      learningStep === 0 && secondMinutes !== undefined
        ? secondMinutes
        : ConvertStepUnitToMinutes(nextStepUnit)
    if (nextMinutes > 0) {
      result[Rating.Good] = {
        scheduledMinutes: Math.round(nextMinutes),
        nextStep: learningStep + 1,
      }
    }
  }

  return result
}
