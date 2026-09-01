import { defineSchema, isObject } from '@open-spaced-repetition/srs-kit'
import { FSRSValidationError } from '@/error.js'
import { clamp } from '@/help.js'
import { isNumberArray } from '@/kit/schema-utils.js'
import { FSRS3_DEFAULT_WEIGHTS, FSRS3ParameterBounds } from './constants.js'

export const clipFSRS3Parameters = (parameters: number[]): number[] => {
  const clip = FSRS3ParameterBounds().slice(0, parameters.length)
  return clip.map(([min, max], index) =>
    clamp(parameters[index] ?? 0, min, max)
  )
}

export const checkFSRS3Parameters = (
  parameters: number[] | readonly number[]
) => {
  const clipped = clipFSRS3Parameters(Array.from(parameters))
  const isValid =
    parameters.length === FSRS3_DEFAULT_WEIGHTS.length &&
    clipped.every((value, index) => value === parameters[index])

  if (!isValid) {
    throw new FSRSValidationError('Expected FSRS3 weights within model bounds.')
  }

  return parameters
}

export const migrateFSRS3Parameters = (parameters?: number[]): number[] => {
  if (!Array.isArray(parameters) || parameters.length === 0) {
    return [...FSRS3_DEFAULT_WEIGHTS]
  }
  return parameters.slice(0, FSRS3_DEFAULT_WEIGHTS.length)
}

export type FSRS3Config = {
  readonly weights: number[]
}

export const fsrs3ConfigSchema = defineSchema<FSRS3Config>((value) => {
  if (isObject(value) && isNumberArray(value.weights)) {
    return {
      value: {
        weights: value.weights,
      },
    }
  }

  return { issues: [{ message: 'Expected FSRS3 config' }] }
})
