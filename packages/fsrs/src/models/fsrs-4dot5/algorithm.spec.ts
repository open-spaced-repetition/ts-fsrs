import { type Grade, grades, Rating } from '@open-spaced-repetition/srs-kit'
import { describe, expect, it } from 'vitest'
import type { FSRSState } from '@/kit/types.js'
import {
  FSRS4Dot5_DECAY,
  FSRS4Dot5_DEFAULT_WEIGHTS,
  FSRS4Dot5_FACTOR,
  FSRS4Dot5_MODEL_BOUNDS,
  FSRS4Dot5Algorithm,
  forgettingCurve,
} from './index.js'

describe('FSRS4Dot5Algorithm', () => {
  const weights = FSRS4Dot5_DEFAULT_WEIGHTS
  const algorithm = new FSRS4Dot5Algorithm(weights, FSRS4Dot5_MODEL_BOUNDS)
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

  it('uses the FSRS-4.5 forgetting curve constants', () => {
    expect(FSRS4Dot5_DECAY).toBe(0.5)
    expect(FSRS4Dot5_FACTOR).toBe(19 / 81)
    expect([0, 1, 2, 3].map((t) => forgettingCurve(t, 1))).toEqual([
      1, 0.9, 0.82502865, 0.76613088,
    ])
    // https://github.com/open-spaced-repetition/fsrs-rs/blob/2c8c951d3f5eb7637d19ddea55ad79f34e56d683/src/model.rs#L253-L263
    expectCloseArray(
      [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 4],
        [5, 2],
      ].map(([t, stability]) => forgettingCurve(t, stability)),
      [1, 0.946059, 0.9299294, 0.9221679, 0.90000004, 0.79394597]
    )
  })

  it('calculates intervals through the FSRS-4.5 interval modifier', () => {
    expect(algorithm.next_interval(13.8206, 0.9)).toBe(14)
    expect(() => algorithm.next_interval(13.8206, 0)).toThrow(
      'Desired retention rate should be in the range (0,1]'
    )
  })

  it('initializes the first review state from FSRS-4.5 weights', () => {
    expect(
      () => new FSRS4Dot5Algorithm(weights.slice(0, 16), FSRS4Dot5_MODEL_BOUNDS)
    ).toThrow('FSRS4Dot5Algorithm requires exactly 17 weights')
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

  it('matches fsrs-rs difficulty update results to 4 decimals', () => {
    // https://github.com/open-spaced-repetition/fsrs-rs/blob/2c8c951d3f5eb7637d19ddea55ad79f34e56d683/src/model.rs#L279-L299
    expectCloseArray(
      grades.map((rating) => 5 - weights[6] * (rating - 3)),
      [5 + 2 * weights[6], 5 + weights[6], 5, 5 - weights[6]]
    )
    expectCloseArray(
      grades.map((rating) => algorithm.next_difficulty(5, rating)),
      [6.744371, 5.8746934, 5.005016, 4.1353383]
    )
  })

  it('matches fsrs-rs stability update results to 4 decimals', () => {
    // https://github.com/open-spaced-repetition/fsrs-rs/blob/2c8c951d3f5eb7637d19ddea55ad79f34e56d683/src/model.rs#L301-L331
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

    expectCloseArray(recall, [27.980768, 14.916422, 66.45966, 222.94603], 4)
    expectCloseArray(forget, [1.9482934, 2.161251, 2.4528089, 2.8098207], 4)
    expectCloseArray(
      nextStability,
      [1.9482934, 14.916422, 66.45966, 222.94603],
      4
    )
  })

  it('matches fsrs-rs forward result to 4 decimals', () => {
    // https://github.com/open-spaced-repetition/fsrs-rs/blob/2c8c951d3f5eb7637d19ddea55ad79f34e56d683/src/model.rs#L317-L337
    const ratings: Grade[] = [
      Rating.Again,
      Rating.Hard,
      Rating.Good,
      Rating.Easy,
      Rating.Again,
      Rating.Hard,
    ]
    const intervals = [1, 1, 1, 1, 2, 2]
    const states = ratings.map((rating, index) =>
      algorithm.next_state(
        algorithm.next_state(null, 0, rating),
        intervals[index],
        rating
      )
    )

    expectCloseArray(
      states.map((state) => state.stability),
      [0.3273601, 1.9898274, 6.7310715, 22.790451, 0.3884622, 2.4991434],
      4
    )
    expectCloseArray(
      states.map((state) => state.difficulty),
      [9.284508, 7.2231536, 5.1618, 3.1004462, 9.284508, 7.2231536],
      4
    )
  })

  it('caps post-lapse stability at the previous stability', () => {
    const state = algorithm.next_state(
      { difficulty: 1, stability: 0.1 },
      1,
      Rating.Again
    )

    expect(state.stability).toBe(0.1)
  })

  it('matches FSRS-4.5 memory-state progression', () => {
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
      { difficulty: 7.6214, stability: 0.4872 },
      { difficulty: 7.5452, stability: 0.4872 },
      { difficulty: 7.4713, stability: 2.4661 },
      { difficulty: 7.3997, stability: 7.7127 },
      { difficulty: 7.3303, stability: 20.1432 },
      { difficulty: 7.2631, stability: 49.2964 },
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
