import { describe, expect, it } from 'vitest'
import { statsConfigSchema, statsFieldsSchema } from './schema.js'

describe('statsConfigSchema', () => {
  it('defaults clearStatsOnForget to true', () => {
    expect(statsConfigSchema.parse({})).toEqual({
      clearStatsOnForget: true,
    })
  })

  it('accepts clearStatsOnForget false', () => {
    expect(statsConfigSchema.parse({ clearStatsOnForget: false })).toEqual({
      clearStatsOnForget: false,
    })
  })

  it('rejects non-object values', () => {
    expect(() => statsConfigSchema.parse(null)).toThrow(
      'Expected stats config object'
    )
  })

  it('rejects non-boolean clearStatsOnForget values', () => {
    expect(() =>
      statsConfigSchema.parse({ clearStatsOnForget: 'false' })
    ).toThrow('Expected boolean clearStatsOnForget')
  })
})

describe('statsFieldsSchema', () => {
  it('accepts non-negative integer stats fields', () => {
    expect(statsFieldsSchema.parse({ reps: 1, lapses: 0 })).toEqual({
      reps: 1,
      lapses: 0,
    })
  })

  it('rejects non-object values', () => {
    expect(() => statsFieldsSchema.parse(null)).toThrow('Expected stats object')
  })

  it('rejects non-number stats fields', () => {
    expect(() => statsFieldsSchema.parse({ reps: '1', lapses: 0 })).toThrow(
      'Expected non-negative integer reps'
    )
    expect(() => statsFieldsSchema.parse({ reps: 1, lapses: '0' })).toThrow(
      'Expected non-negative integer lapses'
    )
  })

  it('rejects negative stats fields', () => {
    expect(() => statsFieldsSchema.parse({ reps: -1, lapses: 0 })).toThrow(
      'Expected non-negative integer reps'
    )
    expect(() => statsFieldsSchema.parse({ reps: 1, lapses: -1 })).toThrow(
      'Expected non-negative integer lapses'
    )
  })

  it('rejects fractional stats fields', () => {
    expect(() => statsFieldsSchema.parse({ reps: 1.5, lapses: 0 })).toThrow(
      'Expected non-negative integer reps'
    )
    expect(() => statsFieldsSchema.parse({ reps: 1, lapses: 0.5 })).toThrow(
      'Expected non-negative integer lapses'
    )
  })
})
