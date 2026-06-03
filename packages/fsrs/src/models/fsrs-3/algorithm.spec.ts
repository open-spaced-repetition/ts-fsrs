import { describe, expect, it } from 'vitest'
import { type Grade, Rating } from '../../models.js'
import { FSRS3Algorithm, forgetting_curve } from './algorithm.js'
import { FSRS3_DEFAULT_WEIGHTS, FSRS3_MODEL_BOUNDS } from './constants.js'

describe('FSRS3Algorithm', () => {
  const algorithm = new FSRS3Algorithm(
    FSRS3_DEFAULT_WEIGHTS,
    FSRS3_MODEL_BOUNDS
  )
  const expectCloseStates = (
    actual: Array<{ stability: number; difficulty: number }>,
    expected: Array<{ stability: number; difficulty: number }>
  ) => {
    expect(actual).toHaveLength(expected.length)
    actual.forEach((state, index) => {
      expect(state.stability).toBeCloseTo(expected[index].stability, 4)
      expect(state.difficulty).toBeCloseTo(expected[index].difficulty, 4)
    })
  }

  it('uses the FSRS-3 forgetting curve and interval formula', () => {
    expect(forgetting_curve(10, 10)).toBe(0.9)
    expect(algorithm.forgetting_curve(5, 10)).toBeCloseTo(Math.pow(0.9, 0.5), 8)
    expect(algorithm.next_interval(10, 0.9)).toBe(10)
    expect(algorithm.next_interval(10, 1)).toBe(1)
    expect(() => algorithm.next_interval(1, 0)).toThrow(
      'Desired retention rate should be in the range (0,1]'
    )
  })

  it('initializes the first review state from FSRS-3 weights', () => {
    const states = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy].map(
      (rating) => algorithm.next_state(null, 0, rating)
    )

    expect(states.map((state) => state.stability)).toEqual([
      0.9605, 2.6839, 4.4073, 6.1307,
    ])
    expect(states.map((state) => state.difficulty)).toEqual([
      7.2361, 6.0444, 4.8527, 3.661,
    ])
  })

  it('matches the FSRS-3 recall and forget formulas', () => {
    const memoryState = { stability: 5, difficulty: 5 }

    expect(algorithm.next_state(memoryState, 5, Rating.Good)).toEqual({
      difficulty: 4.99155971,
      stability: 19.62388865,
    })
    expect(algorithm.next_state(memoryState, 10, Rating.Again)).toEqual({
      difficulty: 7.43428395,
      stability: 2.76257983,
    })
  })

  it('validates algorithm inputs and handles manual reviews as no-ops', () => {
    expect(
      () =>
        new FSRS3Algorithm(
          FSRS3_DEFAULT_WEIGHTS.slice(0, 12),
          FSRS3_MODEL_BOUNDS
        )
    ).toThrow('FSRS3Algorithm requires exactly 13 weights')
    expect(() =>
      algorithm.next_state({ stability: 5, difficulty: 5 }, -1, Rating.Good)
    ).toThrow('Invalid delta_t "-1"')
    expect(() =>
      algorithm.next_state({ stability: 5, difficulty: 5 }, 1, 5)
    ).toThrow('Invalid grade "5"')
    expect(
      algorithm.next_state({ stability: 5, difficulty: 5 }, 1, Rating.Manual)
    ).toEqual({ stability: 5, difficulty: 5 })
    expect(() =>
      algorithm.next_state(
        { stability: 0.001, difficulty: 0.5 },
        1,
        Rating.Good
      )
    ).toThrow('Invalid memory state { difficulty: 0.5, stability: 0.001 }')
  })

  it('uses provided retrievability when stepping a reviewed memory state', () => {
    expect(
      algorithm.next_state({ stability: 5, difficulty: 5 }, 1, Rating.Good, 1)
    ).toEqual({ difficulty: 4.99155971, stability: 5 })
  })

  it('progresses review history through the FSRS-3 state machine', () => {
    // Expected values source: local srs-benchmark/models/fsrs_v3.py Python reference.
    const ratings: Grade[] = [
      Rating.Again,
      Rating.Good,
      Rating.Good,
      Rating.Good,
      Rating.Good,
      Rating.Good,
    ]
    const intervals = [0, 0, 1, 3, 8, 21]
    const states = []
    let state = null

    for (const [index, rating] of ratings.entries()) {
      state = algorithm.next_state(state, intervals[index], rating)
      states.push(state)
    }

    expectCloseStates(states, [
      { stability: 0.9605000019073486, difficulty: 7.236100196838379 },
      { stability: 0.9605000019073486, difficulty: 7.099531173706055 },
      { stability: 3.545196771621704, difficulty: 6.97078800201416 },
      { stability: 9.965413093566895, difficulty: 6.849421501159668 },
      { stability: 24.764307022094727, difficulty: 6.73500919342041 },
      { stability: 58.96782684326172, difficulty: 6.627153396606445 },
    ])
  })
})
