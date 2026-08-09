import { defineSchema, isObject } from '@open-spaced-repetition/srs-kit'
import { FSRSValidationError } from '@/error.js'
import { clamp } from '@/help.js'
import { isNumberArray } from '@/kit/schema-utils.js'
import { FSRS4_DEFAULT_WEIGHTS, FSRS4ParameterBounds } from './constants.js'

export const clipFSRS4Parameters = (parameters: number[]): number[] => {
  const clip = FSRS4ParameterBounds()
  return clip.map(([min, max], index) =>
    clamp(parameters[index] ?? FSRS4_DEFAULT_WEIGHTS[index], min, max)
  )
}

export const checkFSRS4Parameters = (
  parameters: number[] | readonly number[]
) => {
  const clipped = clipFSRS4Parameters(Array.from(parameters))
  const isValid =
    parameters.length === FSRS4_DEFAULT_WEIGHTS.length &&
    clipped.every((value, index) => value === parameters[index])

  if (!isValid) {
    throw new FSRSValidationError('Expected FSRS4 weights within model bounds.')
  }

  return parameters
}

export const migrateFSRS4Parameters = (parameters?: number[]): number[] => {
  if (!Array.isArray(parameters) || parameters.length === 0) {
    return [...FSRS4_DEFAULT_WEIGHTS]
  }
  return clipFSRS4Parameters(parameters)
}

export type FSRS4Config = {
  readonly weights: number[]
}

export const fsrs4ConfigSchema = defineSchema<FSRS4Config>((value) => {
  if (isObject(value) && isNumberArray(value.weights)) {
    return {
      value: {
        weights: value.weights,
      },
    }
  }

  return { issues: [{ message: 'Expected FSRS4 config' }] }
})
