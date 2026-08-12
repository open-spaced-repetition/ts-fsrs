import { describe, expect, it } from 'vitest'
import { monotonicIntervalConfigSchema } from './schema.js'

describe('monotonicIntervalConfigSchema', () => {
  it('parses maximumInterval', () => {
    expect(
      monotonicIntervalConfigSchema.parse({
        maximumInterval: 365,
      })
    ).toEqual({ maximumInterval: 365 })
  })

  it('defaults maximumInterval when omitted', () => {
    expect(monotonicIntervalConfigSchema.parse({})).toEqual({
      maximumInterval: 36_500,
    })
  })

  it.each([
    null,
    { maximumInterval: 0 },
    { maximumInterval: -1 },
    { maximumInterval: 1.5 },
    { maximumInterval: null },
    { maximumInterval: Number.NaN },
    { maximumInterval: Number.POSITIVE_INFINITY },
  ])('rejects invalid config %#', (value) => {
    expect(() => monotonicIntervalConfigSchema.parse(value)).toThrow()
  })
})
