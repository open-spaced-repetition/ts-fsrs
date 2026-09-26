import { describe, expect, it } from 'vitest'
import { scheduledDaysFieldsSchema } from './schema.js'

describe('scheduledDaysFieldsSchema', () => {
  it.each([0, 12, 1.5])(
    'accepts non-negative finite scheduledDays %s',
    (scheduledDays) => {
      expect(scheduledDaysFieldsSchema.parse({ scheduledDays })).toEqual({
        scheduledDays,
      })
    }
  )

  it('rejects non-object input', () => {
    expect(() => scheduledDaysFieldsSchema.parse(null)).toThrow(
      'Expected object with scheduledDays'
    )
  })

  it.each([
    {},
    { scheduledDays: '1' },
    { scheduledDays: Number.NaN },
    { scheduledDays: Number.POSITIVE_INFINITY },
    { scheduledDays: -1 },
  ])('rejects invalid scheduledDays %#', (value) => {
    expect(() => scheduledDaysFieldsSchema.parse(value)).toThrow(
      'scheduledDays must be finite and non-negative'
    )
  })
})
