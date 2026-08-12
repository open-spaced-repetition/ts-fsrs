import { defineSchema } from '@open-spaced-repetition/srs-kit'
import { isObject } from './schema-utils.js'
import type { FSRSState } from './types.js'

export const FSRSMemoryStateSchema = defineSchema<FSRSState>((value) => {
  if (
    isObject(value) &&
    typeof value.stability === 'number' &&
    typeof value.difficulty === 'number'
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
