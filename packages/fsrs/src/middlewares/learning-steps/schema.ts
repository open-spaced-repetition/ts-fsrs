import { defineSchema, isObject } from '@open-spaced-repetition/srs-kit'
import type {
  LearningStepFields,
  LearningStepFieldsInput,
  LearningStepsMiddlewareConfig,
  StepUnit,
} from './types.js'

const STEP_UNIT_PATTERN = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?[mhd]$/

export const defaultLearningSteps: readonly StepUnit[] = Object.freeze([
  '1m',
  '10m',
]) // New->Learning,Learning->Learning

export const defaultRelearningSteps: readonly StepUnit[] = Object.freeze([
  '10m',
]) // Relearning->Relearning

function isStepUnit(value: unknown): value is StepUnit {
  return (
    typeof value === 'string' &&
    STEP_UNIT_PATTERN.test(value) &&
    Number.isFinite(Number(value.slice(0, -1)))
  )
}

function isStepList(value: unknown): value is readonly StepUnit[] {
  return Array.isArray(value) && value.every(isStepUnit)
}

export const learningStepsConfigSchema =
  defineSchema<LearningStepsMiddlewareConfig>((value) => {
    if (!isObject(value)) {
      return { issues: [{ message: 'Expected learning steps config object' }] }
    }

    const { enableShortTerm, learningSteps, relearningSteps } = value
    if (typeof enableShortTerm !== 'boolean') {
      return { issues: [{ message: 'Expected enableShortTerm boolean' }] }
    }
    if (!isStepList(learningSteps)) {
      return { issues: [{ message: 'Expected valid learningSteps array' }] }
    }
    if (!isStepList(relearningSteps)) {
      return { issues: [{ message: 'Expected valid relearningSteps array' }] }
    }

    return { value: { enableShortTerm, learningSteps, relearningSteps } }
  })

export const learningStepFieldsSchema = defineSchema<
  LearningStepFieldsInput,
  LearningStepFields
>((value) => {
  if (!isObject(value)) {
    return { issues: [{ message: 'Expected learning step fields object' }] }
  }

  const { learningStep } = value
  if (learningStep === undefined) {
    return { value: { learningStep: 0 } }
  }
  if (
    typeof learningStep !== 'number' ||
    !Number.isInteger(learningStep) ||
    learningStep < 0
  ) {
    return {
      issues: [{ message: 'Expected non-negative integer learningStep' }],
    }
  }

  return { value: { learningStep } }
})
