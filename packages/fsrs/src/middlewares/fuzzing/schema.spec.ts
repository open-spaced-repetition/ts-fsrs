import { describe, expect, it } from 'vitest'
import {
  fuzzingCardFieldsSchema,
  fuzzingCardInitInputSchema,
  fuzzingConfigSchema,
  fuzzingRevlogFieldsSchema,
} from './schema.js'

describe('fuzzingConfigSchema', () => {
  it('parses camelCase fuzzing config', () => {
    expect(
      fuzzingConfigSchema.parse({
        enableFuzz: true,
        maximumInterval: 365,
      })
    ).toEqual({ enableFuzz: true, maximumInterval: 365 })
  })

  it.each([
    null,
    {},
    { enableFuzz: 1, maximumInterval: 365 },
    { enableFuzz: true, maximumInterval: 0 },
    { enableFuzz: true, maximumInterval: Number.NaN },
  ])('rejects invalid config %#', (value) => {
    expect(() => fuzzingConfigSchema.parse(value)).toThrow()
  })
})

describe('fuzzingCardInitInputSchema', () => {
  it('parses missing, string, and numeric card IDs', () => {
    expect(fuzzingCardInitInputSchema.parse({})).toEqual({})
    expect(fuzzingCardInitInputSchema.parse({ cardId: 'card-1' })).toEqual({
      cardId: 'card-1',
    })
    expect(fuzzingCardInitInputSchema.parse({ cardId: 42 })).toEqual({
      cardId: 42,
    })
  })

  it.each([
    null,
    { cardId: '' },
    { cardId: null },
    { cardId: Number.NaN },
    { cardId: Number.POSITIVE_INFINITY },
  ])('rejects an invalid new-card input %#', (value) => {
    expect(() => fuzzingCardInitInputSchema.parse(value)).toThrow()
  })
})

describe('fuzzing field schemas', () => {
  it('parses string and numeric card IDs', () => {
    expect(
      fuzzingCardFieldsSchema.parse({ cardId: 'card-1', reps: 2 })
    ).toEqual({
      cardId: 'card-1',
      reps: 2,
    })
    expect(fuzzingRevlogFieldsSchema.parse({ cardId: 42 })).toEqual({
      cardId: 42,
    })
  })

  it.each([
    null,
    {},
    { cardId: '', reps: 0 },
    { cardId: null, reps: 0 },
    { cardId: Number.NaN, reps: 0 },
  ])('requires a valid cardId %#', (value) => {
    expect(() => fuzzingCardFieldsSchema.parse(value)).toThrow(
      'Expected card cardId'
    )
    expect(() => fuzzingRevlogFieldsSchema.parse(value)).toThrow(
      'Expected revlog cardId'
    )
  })

  it.each([
    { cardId: 'card', reps: -1 },
    { cardId: 'card', reps: 1.5 },
    { cardId: 'card', reps: '1' },
  ])('requires valid reps %#', (value) => {
    expect(() => fuzzingCardFieldsSchema.parse(value)).toThrow(
      'Expected non-negative integer reps'
    )
  })
})
