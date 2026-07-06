import { describe, expect, it } from 'vitest'
import { Grades } from '../../help.js'
import { type FSRSState, type Grade, Rating } from '../../models.js'
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

  it('uses the FSRS-4.5 forgetting curve constants', () => {
    expect(FSRS4Dot5_DECAY).toBe(0.5)
    expect(FSRS4Dot5_FACTOR).toBe(19 / 81)
    expect([0, 1, 2, 3].map((t) => forgettingCurve(t, 1))).toEqual([
      1, 0.9, 0.82502865, 0.76613088,
    ])
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
    expect(Grades.map((rating) => algorithm.init_stability(rating))).toEqual([
      0.4872, 1.4003, 3.7145, 13.8206,
    ])
    expect(Grades.map((rating) => algorithm.init_difficulty(rating))).toEqual([
      7.6214, 6.3916, 5.1618, 3.932,
    ])
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
