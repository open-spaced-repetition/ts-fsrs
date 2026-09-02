import { describe, expect, it } from 'vitest'
import { FSRS6_DECAY, FSRS6_DEFAULT_WEIGHTS } from './constants.js'
import {
  checkFSRS6Parameters,
  clipFSRS6Parameters,
  decaySchema,
  migrateFSRS6Parameters,
} from './parameters.js'

describe('FSRS-6 parameters', () => {
  it('validates decay', () => {
    expect(decaySchema.parse(FSRS6_DECAY)).toBe(FSRS6_DECAY)
    expect(decaySchema.parse(0.1)).toBe(0.1)
    expect(decaySchema.parse(0.8)).toBe(0.8)
    expect(() => decaySchema.parse('0.1542')).toThrow()
    expect(() => decaySchema.parse(0.09)).toThrow()
    expect(() => decaySchema.parse(0.81)).toThrow()
    expect(() => decaySchema.parse(Number.NaN)).toThrow()
  })

  it('checks default weights with default options', () => {
    const weights = Array.from(FSRS6_DEFAULT_WEIGHTS)

    expect(checkFSRS6Parameters(weights)).toBe(weights)
    expect(clipFSRS6Parameters(weights)).toEqual(weights)
  })

  it('rejects incorrect parameter length', () => {
    expect(() =>
      checkFSRS6Parameters(FSRS6_DEFAULT_WEIGHTS.slice(0, 20))
    ).toThrow('Expected FSRS6 weights within model bounds.')
  })

  it('migrates without clipping', () => {
    const weights = Array.from(FSRS6_DEFAULT_WEIGHTS)
    weights[0] = 0

    expect(migrateFSRS6Parameters(weights)).toEqual(weights)
    expect(() => checkFSRS6Parameters(weights)).toThrow(
      'Expected FSRS6 weights within model bounds.'
    )
  })
})
