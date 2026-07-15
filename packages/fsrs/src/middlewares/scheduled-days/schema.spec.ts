import { describe, expect, it } from 'vitest'
import { scheduledDaysFieldsSchema } from './schema.js'

describe('scheduledDaysFieldsSchema', () => {
  it.each([
    0, 12, 1.5, -1,
  ])('accepts finite scheduledDays %s', (scheduledDays) => {
    expect(scheduledDaysFieldsSchema.parse({ scheduledDays })).toEqual({
      scheduledDays,
    })
  })

  it.each([
    null,
    {},
    { scheduledDays: '1' },
    { scheduledDays: Number.NaN },
    { scheduledDays: Number.POSITIVE_INFINITY },
  ])('rejects invalid scheduledDays %#', (value) => {
    expect(() => scheduledDaysFieldsSchema.parse(value)).toThrow(
      'Expected finite scheduledDays'
    )
  })
})
