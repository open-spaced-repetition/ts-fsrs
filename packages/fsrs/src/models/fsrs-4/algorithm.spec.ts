import { type Grade, grades, Rating } from '@open-spaced-repetition/srs-kit'
import { describe, expect, it } from 'vitest'
import {
  FSRS4_DEFAULT_WEIGHTS,
  FSRS4_MODEL_BOUNDS,
  FSRS4Algorithm,
  forgettingCurve,
} from './index.js'

type FSRSState = ReturnType<FSRS4Algorithm['next_state']>

describe('FSRS4Algorithm', () => {
  const weights = FSRS4_DEFAULT_WEIGHTS
  const algorithm = new FSRS4Algorithm(weights, FSRS4_MODEL_BOUNDS)
  const roundState = (state: FSRSState): FSRSState => ({
    stability: Number(state.stability.toFixed(4)),
    difficulty: Number(state.difficulty.toFixed(4)),
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

  it('uses the FSRS-4 forgetting curve', () => {
    // Expected values source: srs-benchmark/models/fsrs_v4.py Python reference at 70cc4387f573ff20b13ac9c106333a335c8a4cb8.
    // https://github.com/open-spaced-repetition/srs-benchmark/blob/70cc4387f573ff20b13ac9c106333a335c8a4cb8/models/fsrs_v4.py
    expect([0, 1, 2, 3].map((t) => forgettingCurve(t, 1))).toEqual([
      1, 0.9, 0.81818182, 0.75,
    ])
  })

  it('calculates intervals through the FSRS-4 interval modifier', () => {
    // Expected values source: fsrs-rs PR #58 test_next_interval result.
    // https://github.com/open-spaced-repetition/fsrs-rs/pull/58/changes
    const requestRetentions = Array.from({ length: 10 }, (_, index) =>
      Number(((index + 1) / 10).toFixed(1))
    )
    const intervals = requestRetentions.map((retention) =>
      algorithm.next_interval(1, retention)
    )

    expect(intervals).toEqual([81, 36, 21, 14, 9, 6, 4, 2, 1, 1])
    expect(algorithm.next_interval(13.8206, 0.9)).toBe(14)
    expect(() => algorithm.next_interval(13.8206, 0)).toThrow(
      'Requested retention rate should be in the range (0,1]'
    )
  })

  it('initializes the first review state from FSRS-4 weights', () => {
    expect(
      () => new FSRS4Algorithm(weights.slice(0, 16), FSRS4_MODEL_BOUNDS)
    ).toThrow('FSRS4Algorithm requires exactly 17 weights')
    expect(grades.map((rating) => algorithm.init_stability(rating))).toEqual([
      weights[0],
      weights[1],
      weights[2],
      weights[3],
    ])
    expectCloseArray(
      grades.map((rating) => algorithm.init_difficulty(rating)),
      [
        weights[4] + 2 * weights[5],
        weights[4] + weights[5],
        weights[4],
        weights[4] - weights[5],
      ]
    )
  })

  it('matches the Python reference difficulty update results to 4 decimals', () => {
    // Expected values source: srs-benchmark/models/fsrs_v4.py Python reference at 70cc4387f573ff20b13ac9c106333a335c8a4cb8.
    // https://github.com/open-spaced-repetition/srs-benchmark/blob/70cc4387f573ff20b13ac9c106333a335c8a4cb8/models/fsrs_v4.py
    expectCloseArray(
      grades.map((rating) => 5 - weights[6] * (rating - 3)),
      [5 + 2 * weights[6], 5 + weights[6], 5, 5 - weights[6]]
    )
    expectCloseArray(
      grades.map((rating) => algorithm.next_difficulty(5, rating)),
      [6.7021008, 5.8507004, 4.9993, 4.1479001],
      4
    )
  })

  it('matches the Python reference stability update results to 4 decimals', () => {
    // Expected values source: srs-benchmark/models/fsrs_v4.py Python reference at 70cc4387f573ff20b13ac9c106333a335c8a4cb8.
    // https://github.com/open-spaced-repetition/srs-benchmark/blob/70cc4387f573ff20b13ac9c106333a335c8a4cb8/models/fsrs_v4.py
    const stability = [5, 5, 5, 5]
    const difficulty = [1, 2, 3, 4]
    const retention = [0.9, 0.8, 0.7, 0.6]
    const recall = grades.map((rating, index) =>
      algorithm.next_recall_stability(
        difficulty[index],
        stability[index],
        retention[index],
        rating
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

    expectCloseArray(recall, [22.454704, 14.560361, 51.155739, 152.6869], 4)
    expectCloseArray(forget, [2.074517, 2.272933, 2.526406, 2.824732], 4)
    expectCloseArray(
      nextStability,
      [2.074517, 14.560361, 51.155739, 152.6869],
      4
    )
  })

  it('matches the fsrs-rs PR #58 scheduler memory-state results', () => {
    // Expected values source: fsrs-rs PR #58 test_memo_state result.
    // https://github.com/open-spaced-repetition/fsrs-rs/pull/58/changes
    const rsWeights = [
      0.81497127, 1.5411042, 4.007436, 9.045982, 4.9264183, 1.039322,
      0.93803364, 0, 1.5530516, 0.10299722, 0.9981442, 2.210701, 0.018248068,
      0.3422524, 1.3384504, 0.22278537, 2.6646678,
    ]
    const algo = new FSRS4Algorithm(rsWeights, FSRS4_MODEL_BOUNDS)
    const reviews: { rating: Grade; deltaT: number }[] = [
      { rating: Rating.Again, deltaT: 0 },
      { rating: Rating.Good, deltaT: 1 },
      { rating: Rating.Good, deltaT: 3 },
      { rating: Rating.Good, deltaT: 8 },
      { rating: Rating.Good, deltaT: 21 },
    ]
    let state: FSRSState | null = null

    for (const review of reviews) {
      state = algo.next_state(state, review.deltaT, review.rating)
    }

    expectCloseArray(
      [state!.stability, state!.difficulty],
      [51.344814, 7.005062],
      4
    )
    const nextState = algo.next_state(
      { stability: 20.925528, difficulty: 7.005062 },
      21,
      Rating.Good
    )

    expectCloseArray(
      [nextState.stability, nextState.difficulty],
      [51.344814, 7.005062],
      4
    )
  })

  it('matches the Python reference default memory-state progression', () => {
    // Expected values source: srs-benchmark/models/fsrs_v4.py Python reference at 70cc4387f573ff20b13ac9c106333a335c8a4cb8.
    // https://github.com/open-spaced-repetition/srs-benchmark/blob/70cc4387f573ff20b13ac9c106333a335c8a4cb8/models/fsrs_v4.py
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

    expect(states.map(roundState)).toEqual([
      { difficulty: 6.81, stability: 0.4 },
      { difficulty: 6.7912, stability: 0.4 },
      { difficulty: 6.7726, stability: 2.3254 },
      { difficulty: 6.7542, stability: 7.1731 },
      { difficulty: 6.7359, stability: 18.3727 },
      { difficulty: 6.7179, stability: 44.2147 },
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
