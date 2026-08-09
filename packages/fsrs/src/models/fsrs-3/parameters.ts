import { defineSchema, isObject } from '@open-spaced-repetition/srs-kit'
import { FSRSValidationError } from '@/error.js'
import { clamp } from '@/help.js'
import { isNumberArray } from '@/kit/schema-utils.js'
import { FSRS3_DEFAULT_WEIGHTS, FSRS3ParameterBounds } from './constants.js'

export const clipFSRS3Parameters = (parameters: number[]): number[] => {
  const clip = FSRS3ParameterBounds()
  return clip.map(([min, max], index) =>
    clamp(parameters[index] ?? FSRS3_DEFAULT_WEIGHTS[index], min, max)
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
  return clipFSRS3Parameters(parameters)
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
