import { defineSchema, isObject } from '@open-spaced-repetition/srs-kit'
import { FSRSValidationError } from '@/error.js'
import { clamp } from '@/help.js'
import { isNumberArray } from '@/kit/schema-utils.js'
import {
  FSRS4Dot5_DEFAULT_WEIGHTS,
  FSRS4Dot5ParameterBounds,
} from './constants.js'

export const clipFSRS4Dot5Parameters = (parameters: number[]): number[] => {
  const clip = FSRS4Dot5ParameterBounds().slice(0, parameters.length)
  return clip.map(([min, max], index) =>
    clamp(parameters[index] || 0, min, max)
  )
}

export const checkFSRS4Dot5Parameters = (
  parameters: number[] | readonly number[]
) => {
  const clipped = clipFSRS4Dot5Parameters(Array.from(parameters))
  const isValid =
    parameters.length === FSRS4Dot5_DEFAULT_WEIGHTS.length &&
    clipped.every((value, index) => value === parameters[index])

  if (!isValid) {
    throw new FSRSValidationError(
      'Expected FSRS4.5 weights within model bounds.'
    )
  }

  return parameters
}

export const migrateFSRS4Dot5Parameters = (parameters?: number[]): number[] => {
  if (!Array.isArray(parameters) || parameters.length === 0) {
    return [...FSRS4Dot5_DEFAULT_WEIGHTS]
  }
  return parameters.slice(0, FSRS4Dot5_DEFAULT_WEIGHTS.length)
}

export type FSRS4Dot5Config = {
  readonly weights: number[]
}

export const fsrs4Dot5ConfigSchema = defineSchema<FSRS4Dot5Config>((value) => {
  if (isObject(value) && isNumberArray(value.weights)) {
    return {
      value: {
        weights: value.weights,
      },
    }
  }

  return { issues: [{ message: 'Expected FSRS4.5 config' }] }
})
