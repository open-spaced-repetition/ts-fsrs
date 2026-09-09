import { describe, expect, expectTypeOf, it } from 'vitest'
import { fractionalDaysConfigSchema } from './fractional-days.js'
import type { SchemaInput } from './standard.js'

describe('shared fractionalDays config', () => {
  it('accepts an omitted input field and produces a boolean output', () => {
    expectTypeOf<
      SchemaInput<typeof fractionalDaysConfigSchema>
    >().toEqualTypeOf<{ readonly fractionalDays?: boolean }>()
    for (const input of [
      {},
      { fractionalDays: undefined },
      { fractionalDays: false },
    ]) {
      const config = fractionalDaysConfigSchema.parse(input)
      expectTypeOf(config.fractionalDays).toEqualTypeOf<boolean>()
      expect(config).toEqual({ fractionalDays: false })
    }
    expect(fractionalDaysConfigSchema.parse({ fractionalDays: true })).toEqual({
      fractionalDays: true,
    })
    for (const value of [null, 1, 'true']) {
      expect(() =>
        fractionalDaysConfigSchema.parse({ fractionalDays: value })
      ).toThrow()
    }
    expect(() => fractionalDaysConfigSchema.parse(null)).toThrow()
  })
})
