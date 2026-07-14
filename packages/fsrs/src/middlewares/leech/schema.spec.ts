import { describe, expect, it } from 'vitest'
import { leechCardFieldsSchema, leechConfigSchema } from './schema.js'

describe('leechConfigSchema', () => {
  it('defaults leechThreshold to disabled', () => {
    expect(leechConfigSchema.parse({})).toEqual({ leechThreshold: 0 })
  })

  it.each([0, 1, 8])('accepts leechThreshold %s', (leechThreshold) => {
    expect(leechConfigSchema.parse({ leechThreshold })).toEqual({
      leechThreshold,
    })
  })

  it.each([
    null,
    { leechThreshold: -1 },
    { leechThreshold: 1.5 },
    { leechThreshold: Number.NaN },
    { leechThreshold: Number.POSITIVE_INFINITY },
    { leechThreshold: '8' },
  ])('rejects invalid config %#', (value) => {
    expect(() => leechConfigSchema.parse(value)).toThrow()
  })
})

describe('leechCardFieldsSchema', () => {
  it('parses non-negative integer lapses', () => {
    expect(leechCardFieldsSchema.parse({ lapses: 0 })).toEqual({ lapses: 0 })
    expect(leechCardFieldsSchema.parse({ lapses: 8 })).toEqual({ lapses: 8 })
  })

  it.each([
    null,
    {},
    { lapses: -1 },
    { lapses: 1.5 },
    { lapses: Number.NaN },
    { lapses: Number.POSITIVE_INFINITY },
    { lapses: '1' },
  ])('rejects invalid lapses %#', (value) => {
    expect(() => leechCardFieldsSchema.parse(value)).toThrow()
  })
})
