import { describe, expect, it } from 'vitest'
import { dateSchema, emptyObjectSchema, numberSchema, parse } from './index.js'

describe('field schemas', () => {
  it('validates empty objects', () => {
    expect(parse(emptyObjectSchema, {})).toEqual({})
    expect(() => parse(emptyObjectSchema, null)).toThrow(
      'Expected empty object'
    )
    expect(() => parse(emptyObjectSchema, { value: 1 })).toThrow(
      'Expected empty object'
    )
  })

  it('validates finite numbers', () => {
    expect(parse(numberSchema, 1.25)).toBe(1.25)
    expect(() => parse(numberSchema, Number.NaN)).toThrow(
      'Expected finite number'
    )
  })

  it('validates dates after the epoch', () => {
    const date = new Date('2026-06-20T00:00:00.000Z')

    expect(parse(dateSchema, date)).toBe(date)
    expect(() => parse(dateSchema, new Date(0))).toThrow('Expected valid Date')
    expect(() => parse(dateSchema, new Date(Number.NaN))).toThrow(
      'Expected valid Date'
    )
  })
})
