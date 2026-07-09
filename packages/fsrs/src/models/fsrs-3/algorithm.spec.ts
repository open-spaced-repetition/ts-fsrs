import { type Grade, grades, Rating } from '@open-spaced-repetition/srs-kit'
import { describe, expect, it } from 'vitest'
import {
  FSRS3_DEFAULT_WEIGHTS,
  FSRS3_MODEL_BOUNDS,
  FSRS3Algorithm,
  forgettingCurve,
} from './index.js'

type FSRSState = ReturnType<FSRS3Algorithm['next_state']>

describe('FSRS3Algorithm', () => {
  const weights = FSRS3_DEFAULT_WEIGHTS
  const algorithm = new FSRS3Algorithm(weights, FSRS3_MODEL_BOUNDS)
  const formatState = (state: FSRSState) => ({
    stability: state.stability.toFixed(8),
    difficulty: state.difficulty.toFixed(8),
  })
  const expectCloseArray = (
    actual: number[],
    expected: number[],
    precision = 6
  ) => {
    expect(actual).toHaveLength(expected.length)
    actual.forEach((value, index) => {
      expect(value).toBeCloseTo(expected[index], precision)
    })
  }

  it('uses the FSRS-3 forgetting curve', () => {
    // Expected values source: srs-benchmark/models/fsrs_v3.py Python reference at 70cc4387f573ff20b13ac9c106333a335c8a4cb8.
    // https://github.com/open-spaced-repetition/srs-benchmark/blob/70cc4387f573ff20b13ac9c106333a335c8a4cb8/models/fsrs_v3.py
    expect([0, 1, 2, 3].map((t) => forgettingCurve(t, 1))).toEqual([
      1, 0.9, 0.81, 0.729,
    ])
  })

  it('calculates intervals through the FSRS-3 interval modifier', () => {
    const requestRetentions = Array.from({ length: 10 }, (_, index) =>
      Number(((index + 1) / 10).toFixed(1))
    )
    const intervals = requestRetentions.map((retention) =>
      algorithm.next_interval(1, retention)
    )

    expect(intervals).toEqual([22, 15, 11, 9, 7, 5, 3, 2, 1, 1])
    expect(algorithm.next_interval(6.1307, 0.9)).toBe(6)
    expect(() => algorithm.next_interval(6.1307, 0)).toThrow(
      'Desired retention rate should be in the range (0,1]'
    )
  })

  it('initializes the first review state from FSRS-3 weights', () => {
    expect(
      () => new FSRS3Algorithm(weights.slice(0, 12), FSRS3_MODEL_BOUNDS)
    ).toThrow('FSRS3Algorithm requires exactly 13 weights')
    expectCloseArray(
      grades.map((rating) => algorithm.init_stability(rating)),
      [
        weights[0],
        weights[0] + weights[1],
        weights[0] + 2 * weights[1],
        weights[0] + 3 * weights[1],
      ]
    )
    const lowerClamped = new FSRS3Algorithm(
      [Number.NEGATIVE_INFINITY, ...weights.slice(1)],
      FSRS3_MODEL_BOUNDS
    )
    const upperClamped = new FSRS3Algorithm(
      [Number.POSITIVE_INFINITY, ...weights.slice(1)],
      FSRS3_MODEL_BOUNDS
    )
    expect(lowerClamped.init_stability(Rating.Again)).toBe(
      FSRS3_MODEL_BOUNDS.sMin
    )
    expect(upperClamped.init_stability(Rating.Again)).toBe(
      FSRS3_MODEL_BOUNDS.sMax
    )
    expectCloseArray(
      grades.map((rating) => algorithm.init_difficulty(rating)),
      [
        weights[2] - 2 * weights[3],
        weights[2] - weights[3],
        weights[2],
        weights[2] + weights[3],
      ]
    )
  })

  it('matches the Python reference difficulty update results to 4 decimals', () => {
    // Expected values source: srs-benchmark/models/fsrs_v3.py Python reference at 70cc4387f573ff20b13ac9c106333a335c8a4cb8.
    // https://github.com/open-spaced-repetition/srs-benchmark/blob/70cc4387f573ff20b13ac9c106333a335c8a4cb8/models/fsrs_v3.py
    expectCloseArray(
      grades.map((rating) => 5 + weights[4] * (rating - 3)),
      [5 - 2 * weights[4], 5 - weights[4], 5, 5 + weights[4]]
    )
    expectCloseArray(
      grades.map((rating) => algorithm.next_difficulty(5, rating)),
      [7.43428395, 6.21292183, 4.99155971, 3.77019759],
      4
    )
  })

  it('matches the Python reference stability update results to 4 decimals', () => {
    // Expected values source: srs-benchmark/models/fsrs_v3.py Python reference at 70cc4387f573ff20b13ac9c106333a335c8a4cb8.
    // https://github.com/open-spaced-repetition/srs-benchmark/blob/70cc4387f573ff20b13ac9c106333a335c8a4cb8/models/fsrs_v3.py
    const stability = [5, 5, 5, 5]
    const difficulty = [1, 2, 3, 4]
    const retention = [0.9, 0.8, 0.7, 0.6]
    const recall = grades.map((_, index) =>
      algorithm.next_recall_stability(
        difficulty[index],
        stability[index],
        retention[index]
      )
    )
    const forget = grades.map((_, index) =>
      algorithm.next_forget_stability(
        difficulty[index],
        stability[index],
        retention[index]
      )
    )
    const nextStability = grades.map(
      (rating, index) =>
        algorithm.next_state(
          { difficulty: difficulty[index], stability: stability[index] },
          0,
          rating,
          retention[index]
        ).stability
    )

    expectCloseArray(
      recall,
      [29.33890984, 51.27167832, 70.2236555, 85.52142222],
      4
    )
    expectCloseArray(forget, [5.41089414, 4.61822464, 4.4010631, 4.38774907], 4)
    expectCloseArray(
      nextStability,
      [3.2899155, 44.15189718, 69.35813996, 99.00878817],
      4
    )
  })

  it('matches the Python reference default memory-state progression to 8 decimals', () => {
    // Expected values source: srs-benchmark/models/fsrs_v3.py Python reference at 70cc4387f573ff20b13ac9c106333a335c8a4cb8.
    // https://github.com/open-spaced-repetition/srs-benchmark/blob/70cc4387f573ff20b13ac9c106333a335c8a4cb8/models/fsrs_v3.py
    const ratings: Grade[] = [
      Rating.Again,
      Rating.Good,
      Rating.Good,
      Rating.Good,
      Rating.Good,
      Rating.Good,
    ]
    const intervals = [0, 0, 1, 3, 8, 21]
    const states: FSRSState[] = []
    let state: FSRSState | null = null

    for (const [index, rating] of ratings.entries()) {
      state = algorithm.next_state(state, intervals[index], rating)
      states.push(state)
    }

    expect(states.map(formatState)).toEqual([
      { stability: '0.96050000', difficulty: '7.23610000' },
      { stability: '0.96050000', difficulty: '7.09953118' },
      { stability: '3.54519473', difficulty: '6.97078775' },
      { stability: '9.96540903', difficulty: '6.84942132' },
      { stability: '24.76429562', difficulty: '6.73500919' },
      { stability: '58.96783581', difficulty: '6.62715287' },
    ])
  })

  it('validates next-state inputs', () => {
    expect(
      algorithm.next_state({ difficulty: 5, stability: 5 }, 1, Rating.Manual)
    ).toEqual({ difficulty: 5, stability: 5 })
    expect(() => algorithm.next_state(null, -1, Rating.Good)).toThrow(
      'Invalid delta_t "-1"'
    )
    expect(() => algorithm.next_state(null, 0, 5)).toThrow('Invalid grade "5"')
    expect(() =>
      algorithm.next_state({ difficulty: 0.5, stability: 0.1 }, 1, Rating.Good)
    ).toThrow('Invalid memory state { difficulty: 0.5, stability: 0.1 }')
  })
})
