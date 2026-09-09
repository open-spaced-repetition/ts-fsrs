import { type Grade, Rating } from '@open-spaced-repetition/srs-kit'
import { describe, expect, it } from 'vitest'
import { FSRS7Algorithm } from './algorithm.js'
import { FSRS7_DEFAULT_WEIGHTS, FSRS7_MODEL_BOUNDS } from './constants.js'
import type { FSRS7State } from './schema.js'

describe('FSRS7Algorithm', () => {
  it('falls back to bisection when the Newton derivative becomes non-finite', () => {
    const algorithm = new FSRS7Algorithm(FSRS7_DEFAULT_WEIGHTS, {
      ...FSRS7_MODEL_BOUNDS,
      stabilityFastMin: Number.MIN_VALUE,
    })
    const state = {
      stability: 10,
      stabilityFast: Number.MIN_VALUE,
      difficulty: 5,
    }
    // The fast component's scale overflows: recall stays finite, but its derivative is 0 * Infinity.
    const curve = algorithm.curve(10, state)
    expect(curve.retrievability).toBeGreaterThan(0)
    expect(curve.retrievability).toBeLessThan(1)
    expect(curve.derivative).toBeNaN()

    const interval = algorithm.next_interval(state, 0.9)
    expect(interval).toBeGreaterThan(0)
    expect(interval).toBeLessThanOrEqual(FSRS7_MODEL_BOUNDS.sMax)
    expect(algorithm.curve(interval, state).retrievability).toBeCloseTo(0.9, 8)
  })

  it('clamps negative elapsed days to zero like fsrs-rs instead of returning NaN', () => {
    const algorithm = new FSRS7Algorithm(
      FSRS7_DEFAULT_WEIGHTS,
      FSRS7_MODEL_BOUNDS
    )
    const state = { stability: 10, stabilityFast: 8, difficulty: 5 }
    const zero = algorithm.curve(0, state)
    // fsrs-rs applies t.max(0.0) at every scalar entry point, so t < 0 behaves as t = 0.
    for (const t of [-1e-9, -0.001, -1, -36500]) {
      const curve = algorithm.curve(t, state)
      expect(curve.retrievability).toBe(zero.retrievability)
      expect(curve.derivative).toBe(zero.derivative)
      expect(algorithm.next_state(state, t, Rating.Good)).toEqual(
        algorithm.next_state(state, 0, Rating.Good)
      )
    }
  })

  it('matches FSRS-7 memory-state progression from fsrs-rs and benchmark', () => {
    const algorithm = new FSRS7Algorithm(
      FSRS7_DEFAULT_WEIGHTS,
      FSRS7_MODEL_BOUNDS
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
    const states: FSRS7State[] = []
    let state: FSRS7State | null = null

    for (const [index, rating] of ratings.entries()) {
      state = algorithm.next_state(state, intervals[index], rating)
      states.push(state)
    }

    const roundState = (state: FSRS7State): FSRS7State => ({
      difficulty: Number(state.difficulty.toFixed(4)),
      stability: Number(state.stability.toFixed(4)),
      stabilityFast: Number(state.stabilityFast.toFixed(4)),
    })
    // fsrs-rs c9562d6 and srs-benchmark b4b0254 agree at four decimal places.
    expect(states.map(roundState)).toEqual([
      { difficulty: 6.1686, stability: 0.1104, stabilityFast: 0.0883 },
      { difficulty: 6.1092, stability: 0.1104, stabilityFast: 0.0883 },
      { difficulty: 6.0504, stability: 0.9169, stabilityFast: 44.4442 },
      { difficulty: 5.9922, stability: 3.5338, stabilityFast: 193.5973 },
      { difficulty: 5.9346, stability: 10.186, stabilityFast: 407.6265 },
      { difficulty: 5.8775, stability: 25.9857, stabilityFast: 700.5589 },
    ])
  })

  it('rounds initialized memory fields before applying their bounds', () => {
    const weights = [...FSRS7_DEFAULT_WEIGHTS]
    weights[0] = 1.234567891
    const algorithm = new FSRS7Algorithm(weights, FSRS7_MODEL_BOUNDS)
    expect(algorithm.next_state(null, 0, Rating.Again)).toEqual({
      stability: 1.23456789,
      stabilityFast: 0.98765431,
      difficulty: 6.1686,
    })

    const bounds = {
      sMin: 1.000000004,
      sMax: 20,
      stabilityFastMin: 0.800000004,
      stabilityFastMax: 16,
      dMin: 7.000000004,
      dMax: 9,
    }
    const bounded = new FSRS7Algorithm(FSRS7_DEFAULT_WEIGHTS, bounds)
    expect(bounded.next_state(null, 0, Rating.Again)).toEqual({
      stability: bounds.sMin,
      stabilityFast: bounds.stabilityFastMin,
      difficulty: bounds.dMin,
    })
  })

  it('uses injected bounds for initialization, state updates, curves and intervals', () => {
    const bounds = {
      sMin: 0.5,
      sMax: 2,
      stabilityFastMin: 0.1,
      stabilityFastMax: 0.25,
      dMin: 4,
      dMax: 6,
    }
    const algorithm = new FSRS7Algorithm(FSRS7_DEFAULT_WEIGHTS, bounds)
    expect(algorithm.next_state(null, 0, Rating.Again)).toEqual({
      stability: 0.5,
      stabilityFast: 0.25,
      difficulty: 6,
    })
    expect(algorithm.next_state(null, 0, Rating.Easy)).toEqual({
      stability: 2,
      stabilityFast: 0.25,
      difficulty: 4,
    })

    const input = { stability: 100, stabilityFast: 100, difficulty: 10 }
    const clamped = { stability: 2, stabilityFast: 0.25, difficulty: 6 }
    expect(algorithm.curve(1, input)).toEqual(algorithm.curve(1, clamped))
    const zero = { stability: 0, stabilityFast: 0, difficulty: 0 }
    const minimum = { stability: 0.5, stabilityFast: 0.1, difficulty: 4 }
    expect(algorithm.curve(0, zero)).toEqual(algorithm.curve(0, minimum))
    for (const retention of [0.1, 0.65, 0.9, 0.99]) {
      expect(algorithm.next_interval(input, retention)).toBe(
        algorithm.next_interval(clamped, retention)
      )
      expect(algorithm.next_interval(zero, retention)).toBe(
        algorithm.next_interval(minimum, retention)
      )
    }
    for (const rating of [
      Rating.Again,
      Rating.Hard,
      Rating.Good,
      Rating.Easy,
    ]) {
      const state = algorithm.next_state(input, 1, rating)
      expect(state).toEqual(algorithm.next_state(clamped, 1, rating))
      expect(state.stability).toBeGreaterThanOrEqual(bounds.sMin)
      expect(state.stability).toBeLessThanOrEqual(bounds.sMax)
      expect(state.stabilityFast).toBeGreaterThanOrEqual(
        bounds.stabilityFastMin
      )
      expect(state.stabilityFast).toBeLessThanOrEqual(bounds.stabilityFastMax)
      expect(state.difficulty).toBeGreaterThanOrEqual(bounds.dMin)
      expect(state.difficulty).toBeLessThanOrEqual(bounds.dMax)
    }
    expect(algorithm.next_interval(input, 0.1)).toBeLessThanOrEqual(bounds.sMax)
    const subday = new FSRS7Algorithm(FSRS7_DEFAULT_WEIGHTS, {
      ...bounds,
      sMax: 0.5,
    })
    expect(subday.next_interval(input, 0.1)).toBeLessThanOrEqual(0.5)
  })

  it('exposes retrievability and its elapsed-day derivative through curve', () => {
    const algorithm = new FSRS7Algorithm(
      FSRS7_DEFAULT_WEIGHTS,
      FSRS7_MODEL_BOUNDS
    )
    const state = { stability: 10, stabilityFast: 8, difficulty: 5 }
    const { retrievability, derivative } = algorithm.curve(1, state)
    const dt = 0.0001
    const difference =
      (algorithm.curve(1 + dt, state).retrievability -
        algorithm.curve(1 - dt, state).retrievability) /
      (2 * dt)
    expect(retrievability).toBeGreaterThan(0)
    expect(retrievability).toBeLessThan(1)
    expect(derivative).toBeLessThan(0)
    expect(derivative).toBeCloseTo(difference, 8)
  })
})
