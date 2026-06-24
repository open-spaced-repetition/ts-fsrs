import { defineSchema } from '@open-spaced-repetition/srs-kit'
import type { FSRSState } from '../models.js'
import { isObject } from './schema-utils.js'

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
