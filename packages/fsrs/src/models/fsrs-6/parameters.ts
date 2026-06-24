import { defineSchema, isObject } from '@open-spaced-repetition/srs-kit'
import { FSRS5_DEFAULT_DECAY } from '../../constant'
import { FSRSValidationError } from '../../error.js'
import { clamp, roundTo } from '../../help'
import { isNumberArray } from '../../kit/schema-utils.js'
import {
  FSRS6_DEFAULT_WEIGHTS,
  FSRS6_W17_W18_CEILING,
  FSRS6ParameterBounds,
} from './constants'

export const clipFSRS6Parameters = (
  parameters: number[],
  numRelearningSteps = 0,
  enableShortTerm = true
): number[] => {
  const clip = FSRS6ParameterBounds(
    FSRS6_W17_W18_CEILING,
    enableShortTerm
  ).slice(0, parameters.length)

  if (Math.max(0, numRelearningSteps) > 1 && parameters.length >= 19) {
    // PLS = w11 * D ^ -w12 * [(S + 1) ^ w13 - 1] * e ^ (w14 * (1 - R))
    // PLS * e ^ (num_relearning_steps * w17 * w18) should be <= S
    // Given D = 1, R = 0.7, S = 1, PLS is equal to w11 * (2 ^ w13 - 1) * e ^ (w14 * 0.3)
    // So num_relearning_steps * w17 * w18 + ln(w11) + ln(2 ^ w13 - 1) + w14 * 0.3 should be <= ln(1)
    // => num_relearning_steps * w17 * w18 <= - ln(w11) - ln(2 ^ w13 - 1) - w14 * 0.3
    // => w17 * w18 <= -[ln(w11) + ln(2 ^ w13 - 1) + w14 * 0.3] / num_relearning_steps
    // Clamp w11/w13/w14 first so log() never receives <= 0 (otherwise NaN/-Infinity)
    const w11 = clamp(parameters[11] || 0, clip[11][0], clip[11][1])
    const w13 = clamp(parameters[13] || 0, clip[13][0], clip[13][1])
    const w14 = clamp(parameters[14] || 0, clip[14][0], clip[14][1])
    const value =
      -(Math.log(w11) + Math.log(Math.pow(2.0, w13) - 1.0) + w14 * 0.3) /
      numRelearningSteps

    // sqrt converts the product constraint (w17 * w18 <= value) into per-parameter
    // ceilings, so each individually satisfies the bound. Math.max guards against NaN.
    const w17W18Ceiling = clamp(
      roundTo(Math.sqrt(Math.max(value, 0)), 8),
      0.01,
      FSRS6_W17_W18_CEILING
    )
    if (clip[17]) clip[17] = [clip[17][0], w17W18Ceiling]
    if (clip[18]) clip[18] = [clip[18][0], w17W18Ceiling]
  }

  return clip.map(([min, max], index) =>
    clamp(parameters[index] || 0, min, max)
  )
}

export const migrateFSRS6Parameters = (
  parameters?: number[],
  numRelearningSteps = 0,
  enableShortTerm = true
): number[] => {
  if (!Array.isArray(parameters) || parameters.length === 0) {
    return [...FSRS6_DEFAULT_WEIGHTS]
  }
  switch (parameters.length) {
    case 21:
      return clipFSRS6Parameters(
        Array.from(parameters),
        numRelearningSteps,
        enableShortTerm
      )
    case 19:
      return clipFSRS6Parameters(
        Array.from(parameters),
        numRelearningSteps,
        enableShortTerm
      ).concat([0.0, FSRS5_DEFAULT_DECAY])
    case 17: {
      const weights = clipFSRS6Parameters(
        Array.from(parameters),
        numRelearningSteps,
        enableShortTerm
      )
      weights[4] = +(weights[5] * 2.0 + weights[4]).toFixed(8)
      weights[5] = +(Math.log(weights[5] * 3.0 + 1.0) / 3.0).toFixed(8)
      weights[6] = +(weights[6] + 0.5).toFixed(8)
      return weights.concat([0.0, 0.0, 0.0, FSRS5_DEFAULT_DECAY])
    }
    default:
      throw new FSRSValidationError(
        `Invalid parameters length "${parameters.length}", expected 17, 19 or 21.`
      )
  }
}

export type FSRS6Config = {
  readonly weights: number[]
  readonly enableShortTerm: boolean
  readonly numRelearningSteps: number
}

export const fsrs6ConfigSchema = defineSchema<FSRS6Config>((value) => {
  if (
    isObject(value) &&
    isNumberArray(value.weights) &&
    typeof value.numRelearningSteps === 'number' &&
    Number.isFinite(value.numRelearningSteps)
  ) {
    return {
      value: {
        weights: value.weights,
        enableShortTerm:
          typeof value.enableShortTerm === 'boolean'
            ? value.enableShortTerm
            : true,
        numRelearningSteps: value.numRelearningSteps,
      },
    }
  }

  return { issues: [{ message: 'Expected FSRS6 config' }] }
})
