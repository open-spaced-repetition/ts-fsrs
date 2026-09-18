import { describe, expect, it } from 'vitest'
import {
  dateSchema,
  desiredRetentionSchema,
  elapsedDaysSchema,
  emptyObjectSchema,
  numberSchema,
  parse,
  SRSSchemaError,
  scheduledDaysSchema,
} from './index.js'

describe('field schemas', () => {
  it('requires retention strictly between zero and one', () => {
    expect(desiredRetentionSchema.parse(0.9)).toBe(0.9)
    for (const value of [NaN, Infinity, -1, 0, 1]) {
      expect(() => desiredRetentionSchema.parse(value)).toThrow(SRSSchemaError)
    }
  })

  it('accepts zero and fractional elapsed days and rejects invalid durations', () => {
    for (const value of [0, 1 / 1440, 2]) {
      expect(elapsedDaysSchema.parse(value)).toBe(value)
    }
    for (const value of [NaN, Infinity, -1]) {
      expect(() => elapsedDaysSchema.parse(value)).toThrow(SRSSchemaError)
    }
  })

  it('validates scheduled intervals while preserving zero and fractions', () => {
    for (const value of [0, 1 / 1440, 2]) {
      expect(scheduledDaysSchema.parse(value)).toBe(value)
    }
    for (const value of [undefined, null, '1', NaN, Infinity, -1]) {
      expect(() => scheduledDaysSchema.parse(value)).toThrow(SRSSchemaError)
    }
  })
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
