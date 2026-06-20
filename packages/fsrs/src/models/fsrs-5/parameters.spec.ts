import { describe, expect, it } from 'vitest'
import {
  FSRS5_DEFAULT_WEIGHTS,
  FSRS5_MODEL_BOUNDS,
  FSRS5_W17_W18_CEILING,
} from './constants.js'
import { clipFSRS5Parameters, migrateFSRS5Parameters } from './parameters.js'

describe('FSRS-5 parameters', () => {
  it('returns FSRS-5 default weights when input is missing', () => {
    expect(migrateFSRS5Parameters()).toEqual(FSRS5_DEFAULT_WEIGHTS)
  })

  it('clips 19 FSRS-5 weights to model bounds', () => {
    const weights = Array(19).fill(Number.POSITIVE_INFINITY)

    expect(clipFSRS5Parameters(weights)).toEqual([
      100,
      100,
      100,
      100,
      FSRS5_MODEL_BOUNDS.difficultyMax,
      4,
      4,
      0.75,
      4.5,
      0.8,
      3.5,
      5,
      0.25,
      0.9,
      4,
      1,
      6,
      FSRS5_W17_W18_CEILING,
      FSRS5_W17_W18_CEILING,
    ])
  })

  it('migrates FSRS-4.5 17-weight parameters to FSRS-5 19 weights', () => {
    const params17 = [
      0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234, 1.616,
      0.1544, 1.0824, 1.9813, 0.0953, 0.2975, 2.2042, 0.2407, 2.9466,
    ]

    expect(migrateFSRS5Parameters(params17)).toEqual([
      0.4072, 1.1829, 3.1262, 15.4722, 8.2734, 0.31783648, 1.5651, 0.0234,
      1.616, 0.1544, 1.0824, 1.9813, 0.0953, 0.2975, 2.2042, 0.2407, 2.9466, 0,
      0,
    ])
  })

  it('truncates parameters longer than FSRS-5 weights', () => {
    const params = [...FSRS5_DEFAULT_WEIGHTS, 0.0658, 0.1542]

    expect(migrateFSRS5Parameters(params)).toEqual(FSRS5_DEFAULT_WEIGHTS)
  })

  it('clips truncated parameters longer than FSRS-5 weights', () => {
    const params = [
      Number.POSITIVE_INFINITY,
      ...FSRS5_DEFAULT_WEIGHTS.slice(1),
      Number.NEGATIVE_INFINITY,
      0.1542,
    ]

    expect(migrateFSRS5Parameters(params)).toEqual([
      100,
      ...FSRS5_DEFAULT_WEIGHTS.slice(1),
    ])
  })

  it('rejects parameter lengths outside FSRS-4.5 and FSRS-5', () => {
    expect(() => migrateFSRS5Parameters([1, 2, 3])).toThrow(
      'Invalid parameters length "3", expected 17 or 19.'
    )
    expect(() => migrateFSRS5Parameters(Array(18).fill(1))).toThrow(
      'Invalid parameters length "18", expected 17 or 19.'
    )
  })
})
