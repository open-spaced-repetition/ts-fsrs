import { describe, expect, it } from 'vitest'
import { FSRS6_DEFAULT_WEIGHTS } from './constants.js'
import {
  checkFSRS6Parameters,
  clipFSRS6Parameters,
} from './parameters.js'

describe('FSRS-6 parameters', () => {
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
})
