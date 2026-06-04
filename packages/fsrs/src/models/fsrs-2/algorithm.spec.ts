import { describe, expect, it } from 'vitest'
import { type Grade, Rating } from '../../models.js'
import { FSRS2Algorithm, forgetting_curve } from './algorithm.js'
import { FSRS2_DEFAULT_WEIGHTS, FSRS2_MODEL_BOUNDS } from './constants.js'

describe('FSRS2Algorithm', () => {
  const algorithm = new FSRS2Algorithm(
    FSRS2_DEFAULT_WEIGHTS,
    FSRS2_MODEL_BOUNDS
  )

  it('uses the FSRS-2 exponential forgetting curve', () => {
    expect(forgetting_curve(4, 4)).toBe(0.9)
    expect(forgetting_curve(8, 4)).toBe(0.81)
  })

  it('calculates intervals from the FSRS-2 forgetting curve', () => {
    expect(algorithm.next_interval(4, 0.9)).toBe(4)
    expect(algorithm.next_interval(4, 0.8)).toBe(8)
    expect(() => algorithm.next_interval(1, 0)).toThrow(
      'Desired retention rate should be in the range (0,1]'
    )
  })

  it('initializes the first review state from FSRS-2 weights', () => {
    const states = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy].map(
      (rating) => algorithm.next_state(null, 0, rating)
    )

    expect(states.map((state) => state.stability)).toEqual([1, 2, 3, 4])
    expect(states.map((state) => state.difficulty)).toEqual([4, 3, 2, 1])
  })

  it('matches the benchmark memory-state progression', () => {
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
      state = algorithm.next_state(state, intervals[index], rating)
    }

    expect(state!.stability).toBeCloseTo(28.53326086, 8)
    expect(state!.difficulty).toBeCloseTo(2.65536, 8)
  })

  it('uses the new difficulty when calculating post-lapse stability', () => {
    const state = algorithm.next_state(
      { stability: 3, difficulty: 2 },
      3,
      Rating.Again
    )

    expect(state).toEqual({ stability: 0.62958739, difficulty: 3.6 })
  })
})
