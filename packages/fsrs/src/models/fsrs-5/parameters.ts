import { defineSchema, isObject } from '@open-spaced-repetition/srs-kit'
import { FSRSValidationError } from '../../error.js'
import { clamp, roundTo } from '../../help'
import { isNumberArray } from '../../kit/schema-utils.js'
import { FSRS5_DEFAULT_WEIGHTS, FSRS5ParameterBounds } from './constants.js'

export const clipFSRS5Parameters = (parameters: number[]): number[] => {
  const clip = FSRS5ParameterBounds().slice(0, parameters.length)
  return clip.map(([min, max], index) =>
    clamp(parameters[index] || 0, min, max)
  )
}

export const migrateFSRS5Parameters = (parameters?: number[]): number[] => {
  if (!Array.isArray(parameters) || parameters.length === 0) {
    return [...FSRS5_DEFAULT_WEIGHTS]
  }
  if (parameters.length > 19) {
    return clipFSRS5Parameters(parameters)
  }
  switch (parameters.length) {
    case 19:
      return clipFSRS5Parameters(parameters)
    case 17: {
      const weights = clipFSRS5Parameters(parameters)
      weights[4] = roundTo(weights[5] * 2.0 + weights[4], 8)
      weights[5] = roundTo(Math.log(weights[5] * 3.0 + 1.0) / 3.0, 8)
      weights[6] = roundTo(weights[6] + 0.5, 8)
      return clipFSRS5Parameters(weights.concat([0.0, 0.0]))
    }
    default:
      throw new FSRSValidationError(
        `Invalid parameters length "${parameters.length}", expected 17 or 19.`
      )
  }
}

export type FSRS5Config = {
  readonly weights: number[]
  readonly enableShortTerm: boolean
}

export const fsrs5ConfigSchema = defineSchema<FSRS5Config>((value) => {
  if (
    isObject(value) &&
    isNumberArray(value.weights) &&
    typeof value.enableShortTerm === 'boolean'
  ) {
    return {
      value: {
        weights: value.weights,
        enableShortTerm: value.enableShortTerm,
      },
    }
  }

  return { issues: [{ message: 'Expected FSRS5 config' }] }
})
