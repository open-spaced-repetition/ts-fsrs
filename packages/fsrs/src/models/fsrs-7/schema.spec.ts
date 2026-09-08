import { defineScheduler } from '@open-spaced-repetition/srs-kit'
import { dateChrono } from '@open-spaced-repetition/srs-kit/chrono/date'
import { describe, expect, it } from 'vitest'
import { FSRS7_DEFAULT_WEIGHTS } from './constants.js'
import { FSRS7Model } from './model.js'
import { fsrs7ConfigSchema } from './schema.js'

describe('fsrs7ConfigSchema', () => {
  it('accepts the 34 default weights', () => {
    expect(fsrs7ConfigSchema.parse({ weights: FSRS7_DEFAULT_WEIGHTS })).toEqual(
      { weights: FSRS7_DEFAULT_WEIGHTS }
    )
  })

  it.each([
    0, 17, 19, 21, 33, 35,
  ])('rejects %s weights at the schema and composed scheduler boundary', (length) => {
    const config = { weights: Array.from({ length }, () => 1) }
    expect(() => fsrs7ConfigSchema.parse(config)).toThrow(
      'exactly 34 finite weights'
    )
    const definition = defineScheduler({
      model: FSRS7Model,
      chrono: dateChrono,
    })
    expect(() => definition.create({ config })).toThrow(
      'exactly 34 finite weights'
    )
  })

  it.each([
    NaN,
    Infinity,
    -Infinity,
    '1',
    undefined,
    null,
  ])('rejects a non-finite or non-number weight (%s)', (value) => {
    const weights = [...FSRS7_DEFAULT_WEIGHTS]
    expect(() =>
      fsrs7ConfigSchema.parse({ weights: [value, ...weights.slice(1)] })
    ).toThrow('34 finite weights')
  })

  it('rejects an invalid config shape', () => {
    for (const config of [null, {}, { weights: 'invalid' }]) {
      expect(() => fsrs7ConfigSchema.parse(config)).toThrow('FSRS7 config')
    }
  })
})
