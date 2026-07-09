import { describe, expect, it } from 'vitest'
import { FSRS3_DEFAULT_WEIGHTS } from './constants.js'
import { clipFSRS3Parameters, migrateFSRS3Parameters } from './parameters.js'

describe('FSRS-3 parameters', () => {
  it('returns FSRS-3 default weights when input is missing', () => {
    expect(migrateFSRS3Parameters()).toEqual(FSRS3_DEFAULT_WEIGHTS)
  })

  it('clips 13 FSRS-3 weights to model bounds', () => {
    const weights = Array(13).fill(Number.POSITIVE_INFINITY)

    expect(clipFSRS3Parameters(weights)).toEqual([
      10, 5, 10, -0.1, -0.1, 0.5, 2, -0.15, 1.5, 5, -0.01, 0.9, 2,
    ])
  })

  it('clips lower FSRS-3 weight bounds', () => {
    const weights = Array(13).fill(Number.NEGATIVE_INFINITY)

    expect(clipFSRS3Parameters(weights)).toEqual([
      0.1, 0.1, 1, -5, -5, 0.05, 0, -0.8, 0.01, 0.5, -2, 0.01, 0.01,
    ])
  })

  it('fills omitted FSRS-3 weights from defaults when clipping', () => {
    expect(migrateFSRS3Parameters([1, 2, 3])).toEqual([
      1,
      2,
      3,
      ...FSRS3_DEFAULT_WEIGHTS.slice(3),
    ])
  })
})
