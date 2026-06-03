import { describe, expect, it } from 'vitest'
import { type Grade, Rating } from '../../models.js'
import { FSRS5Algorithm, forgetting_curve } from './algorithm.js'
import {
  FSRS5_DECAY,
  FSRS5_DEFAULT_WEIGHTS,
  FSRS5_FACTOR,
  FSRS5_MODEL_BOUNDS,
} from './constants.js'

describe('FSRS5Algorithm', () => {
  const algorithm = new FSRS5Algorithm(
    FSRS5_DEFAULT_WEIGHTS,
    true,
    FSRS5_MODEL_BOUNDS
  )

  it('uses the FSRS-5 forgetting curve constants', () => {
    expect(FSRS5_DECAY).toBe(0.5)
    expect(FSRS5_FACTOR).toBe(19 / 81)
    expect(forgetting_curve(8, 8.2956)).toBe(0.90306221)
  })

  it('calculates intervals through the FSRS-5 interval modifier', () => {
    expect(algorithm.next_interval(15.69105, 0.9)).toBe(16)
    expect(algorithm.next_interval(15.69105, 0.8)).toBe(38)
    expect(() => algorithm.next_interval(1, 0)).toThrow(
      'Requested retention rate should be in the range (0,1]'
    )
  })

  it('initializes the first review state from FSRS-5 weights', () => {
    const states = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy].map(
      (rating) => algorithm.next_state(null, 0, rating)
    )

    expect(states.map((state) => state.stability)).toEqual([
      0.40255, 1.18385, 3.173, 15.69105,
    ])
    expect(states.map((state) => state.difficulty)).toEqual([
      7.1949, 6.48830527, 5.28243442, 3.22450159,
    ])
  })

  it.each([
    [true, 48.26549438, 7.10441712],
    [false, 48.065163, 7.10441712],
  ])('matches v4.7.1 memory-state progression when enableShortTerm=%s', (enableShortTerm, expectedStability, expectedDifficulty) => {
    const testAlgorithm = new FSRS5Algorithm(
      FSRS5_DEFAULT_WEIGHTS,
      enableShortTerm,
      FSRS5_MODEL_BOUNDS
    )
    const ratings: Grade[] = [
      Rating.Again,
      Rating.Good,
      Rating.Good,
      Rating.Good,
      Rating.Good,
      Rating.Good,
    ]
    const intervals = [0, 0, 1, 3, 8, 21]
    let state = null

    for (const [index, rating] of ratings.entries()) {
      state = testAlgorithm.next_state(state, intervals[index], rating)
    }

    expect(state!.stability).toBeCloseTo(expectedStability, 4)
    expect(state!.difficulty).toBeCloseTo(expectedDifficulty, 4)
  })
})
