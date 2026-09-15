import { defineSchema, isFiniteNumber } from '@open-spaced-repetition/srs-kit'
import { isObject } from './schema-utils.js'
import type { FSRSState } from './types.js'

export const FSRSMemoryStateSchema = defineSchema<FSRSState>((value) => {
  if (
    isObject(value) &&
    isFiniteNumber(value.stability) &&
    isFiniteNumber(value.difficulty)
  ) {
    return {
      value: {
        stability: value.stability,
        difficulty: value.difficulty,
      },
    }
  }

  return { issues: [{ message: 'Expected FSRS memory state' }] }
})
