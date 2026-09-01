import { Rating } from '@open-spaced-repetition/srs-kit'
import type {
  ModelForwardInput,
  ModelMemoryOf,
} from '@open-spaced-repetition/srs-kit/model'
import { describe, expect, it } from 'vitest'
import { FSRS4Algorithm } from './algorithm.js'
import { FSRS4_DEFAULT_WEIGHTS, FSRS4Model, forgettingCurve } from './index.js'

type FSRSState = ModelMemoryOf<typeof FSRS4Model>

describe('FSRS-4 model', () => {
  const weights = FSRS4_DEFAULT_WEIGHTS

  it('creates model runtime with schema validation and create options', () => {
    const model = FSRS4Model.create({
      config: {
        weights,
      },
    })
    const bypassConfig = {
      weights: Array.from(weights),
    }

    expect(
      FSRS4Model.defaultValue.memoryState({ config: model.config })
    ).toEqual({
      stability: 0,
      difficulty: 0,
    })
    expect(
      FSRS4Model.create({ config: bypassConfig, bypass: true }).config
    ).toBe(bypassConfig)
    expect(() =>
      FSRS4Model.create({
        config: {
          weights: 'invalid',
        } as never,
        migrate: false,
        check: false,
      })
    ).toThrow()
    expect(() =>
      FSRS4Model.create({
        config: {
          weights: [0, ...weights.slice(1)],
        },
        migrate: false,
        clip: false,
        check: true,
      })
    ).toThrow('Expected FSRS4 weights within model bounds.')
    expect(
      FSRS4Model.create({
        config: {
          weights,
          enableShortTerm: true,
        } as never,
      }).config
    ).toEqual(model.config)
  })

  it('exposes the FSRS-4 model runtime methods', () => {
    const model = FSRS4Model.create({
      config: {
        weights,
      },
    })
    const initialState = model.step({
      memoryState: null,
      rating: Rating.Easy,
      elapsedDays: 0,
    })
    const states = model.forward({
      history: [
        { rating: Rating.Again, deltaT: 0 },
        { rating: Rating.Good, deltaT: 1 },
      ],
    })

    expect(Number.isFinite(initialState.stability)).toBe(true)
    expect(Number.isFinite(initialState.difficulty)).toBe(true)
    expect(Number.isFinite(model.nextInterval(initialState, 0.9))).toBe(true)
    expect(Number.isFinite(model.forgettingCurve(initialState, 14))).toBe(true)
    expect(states).toHaveLength(2)
  })

  it('exposes the underlying algorithm instance', () => {
    const model = FSRS4Model.create({
      config: {
        weights,
      },
    })

    expect(model.algorithm).toBeInstanceOf(FSRS4Algorithm)
  })

  it('uses FSRS-4 default weights', () => {
    expect(FSRS4_DEFAULT_WEIGHTS).toEqual([
      0.4, 0.9, 2.3, 10.9, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05,
      0.34, 1.26, 0.29, 2.61,
    ])
  })

  it('calculates the FSRS-4 forgetting curve and interval modifier', () => {
    const model = FSRS4Model.create({ config: { weights } })
    const state: FSRSState = { stability: 10, difficulty: 5 }

    expect(forgettingCurve(10, 10)).toBe(0.9)
    expect(model.forgettingCurve(state, 10)).toBe(0.9)
    expect(model.nextInterval(state, 0.9)).toBe(10)
    expect(model.nextInterval(state, 0.8)).toBe(23)
  })

  it('calculates initial memory states with FSRS-4 formulas', () => {
    const model = FSRS4Model.create({ config: { weights } })

    expect(
      model.step({ memoryState: null, rating: Rating.Again, elapsedDays: 0 })
    ).toEqual({
      difficulty: 6.81,
      stability: 0.4,
    })
    expect(
      model.step({ memoryState: null, rating: Rating.Hard, elapsedDays: 0 })
    ).toEqual({
      difficulty: 5.87,
      stability: 0.9,
    })
    expect(
      model.step({ memoryState: null, rating: Rating.Good, elapsedDays: 0 })
    ).toEqual({
      difficulty: 4.93,
      stability: 2.3,
    })
    expect(
      model.step({ memoryState: null, rating: Rating.Easy, elapsedDays: 0 })
    ).toEqual({
      difficulty: 3.99,
      stability: 10.9,
    })
  })

  it('calculates review memory states with FSRS-4 formulas', () => {
    const model = FSRS4Model.create({ config: { weights } })
    const initial = model.step({
      memoryState: null,
      rating: Rating.Good,
      elapsedDays: 0,
    })
    const reviewed = model.step({
      memoryState: initial,
      rating: Rating.Good,
      elapsedDays: 2,
    })
    const lapsed = model.step({
      memoryState: reviewed,
      rating: Rating.Again,
      elapsedDays: 6,
    })

    expect(reviewed.stability).toBeCloseTo(7.06007207, 8)
    expect(reviewed.difficulty).toBeCloseTo(4.93, 8)
    expect(lapsed.stability).toBeCloseTo(2.31826584, 8)
    expect(lapsed.difficulty).toBeCloseTo(6.6328, 8)
  })

  it('forwards review history', () => {
    const model = FSRS4Model.create({ config: { weights } })
    const input = {
      history: [
        { rating: Rating.Good, deltaT: 0 },
        { rating: Rating.Good, deltaT: 2 },
        { rating: Rating.Again, deltaT: 6 },
      ],
    } satisfies ModelForwardInput<FSRSState>

    expect(model.forward(input).at(-1)).toEqual({
      difficulty: 6.6328,
      stability: 2.31826584,
    })
  })
})
