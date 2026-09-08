import {
  defineSchema,
  isFiniteNumber,
  isObject,
} from '@open-spaced-repetition/srs-kit'
import { isNumberArray } from '@/kit/schema-utils.js'
import type { FSRSState } from '@/kit/types.js'
import { FSRS7_DEFAULT_WEIGHTS } from './constants.js'

export type FSRS7Config = { readonly weights: readonly number[] }

export const fsrs7ConfigSchema = defineSchema<FSRS7Config>((value) => {
  if (
    isObject(value) &&
    isNumberArray(value.weights) &&
    value.weights.length === FSRS7_DEFAULT_WEIGHTS.length
  ) {
    return { value: { weights: value.weights } }
  }
  return {
    issues: [
      {
        message: `Expected FSRS7 config with exactly ${FSRS7_DEFAULT_WEIGHTS.length} finite weights`,
      },
    ],
  }
})

export interface FSRS7State extends FSRSState {
  stabilityFast: number
  stability: number
  difficulty: number
}

export const FSRS7MemoryStateSchema = defineSchema<FSRS7State>((value) => {
  if (
    isObject(value) &&
    isFiniteNumber(value.stability) &&
    isFiniteNumber(value.stabilityFast) &&
    isFiniteNumber(value.difficulty)
  ) {
    return {
      value: {
        stability: value.stability,
        stabilityFast: value.stabilityFast,
        difficulty: value.difficulty,
      },
    }
  }
  return {
    issues: [
      {
        message:
          'Expected FSRS7 memory state with finite stability, stabilityFast and difficulty',
      },
    ],
  }
})
