import {
  elapsedDaysSchema as kitElapsedDays,
  desiredRetentionSchema as kitRetention,
  scheduledDaysSchema as kitScheduledDays,
} from '@open-spaced-repetition/srs-kit'
import { describe, expect, it } from 'vitest'
import {
  desiredRetentionSchema,
  elapsedDaysSchema,
  scheduledDaysSchema,
} from './index.js'

describe('public field schemas', () => {
  it.each([
    ['scheduledDaysSchema', scheduledDaysSchema, kitScheduledDays, 0, -1],
    ['elapsedDaysSchema', elapsedDaysSchema, kitElapsedDays, 0.5, -1],
    ['desiredRetentionSchema', desiredRetentionSchema, kitRetention, 0.9, 1],
  ] as const)(
    're-exports %s with its validation intact',
    (_name, schema, original, valid, invalid) => {
      expect(schema).toBe(original)
      expect(schema.parse(valid)).toBe(valid)
      expect(() => schema.parse(invalid)).toThrow()
      expect(() => schema.parse(Number.NaN)).toThrow()
    }
  )
})
