import { defineSchema, isObject } from '@open-spaced-repetition/srs-kit'
import { ConvertStepUnitToMinutes } from './core.js'
import type {
  LearningStepFields,
  LearningStepFieldsInput,
  LearningStepsMiddlewareConfig,
  StepUnit,
} from './types.js'

export const defaultLearningSteps: readonly StepUnit[] = Object.freeze([
  '1m',
  '10m',
]) // New->Learning,Learning->Learning

export const defaultRelearningSteps: readonly StepUnit[] = Object.freeze([
  '10m',
]) // Relearning->Relearning

function isStepUnit(value: unknown): value is StepUnit {
  if (typeof value !== 'string') return false
  try {
    const minutes = ConvertStepUnitToMinutes(value as StepUnit)
    // A single step can yield Hard at 1.5x; Chrono converts minutes to ms.
    return Number.isFinite(minutes * 90_000)
  } catch {
    return false
  }
}

function isStepList(value: unknown): value is readonly StepUnit[] {
  if (
    !Array.isArray(value) ||
    Object.getOwnPropertyNames(value).length - 1 < value.length
  ) {
    return false
  }
  for (let index = 0; index < value.length; index++) {
    if (!Object.hasOwn(value, index) || !isStepUnit(value[index])) {
      return false
    }
  }
  return true
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
    !Number.isSafeInteger(learningStep) ||
    learningStep < 0
  ) {
    return {
      issues: [{ message: 'Expected non-negative integer learningStep' }],
    }
  }

  return { value: { learningStep } }
})
