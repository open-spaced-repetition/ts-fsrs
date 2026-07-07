import { describe, expect, it } from 'vitest'
import { Rating } from '../../models.js'
import { FSRS4Dot5_DEFAULT_WEIGHTS, FSRS4Dot5Model } from './index.js'

describe('FSRS-4.5 model', () => {
  const weights = FSRS4Dot5_DEFAULT_WEIGHTS

  it('creates model runtime with schema validation and create options', () => {
    const model = FSRS4Dot5Model.create({
      config: {
        weights,
      },
    })
    const bypassConfig = {
      weights: Array.from(weights),
    }

    expect(
      FSRS4Dot5Model.defaultValue.memoryState({ config: model.config })
    ).toEqual({
      stability: 0,
      difficulty: 0,
    })
    expect(
      FSRS4Dot5Model.create({ config: bypassConfig, bypass: true }).config
    ).toBe(bypassConfig)
    expect(() =>
      FSRS4Dot5Model.create({
        config: {
          weights: 'invalid',
        } as never,
        migrate: false,
        check: false,
      })
    ).toThrow()
    expect(() =>
      FSRS4Dot5Model.create({
        config: {
          weights: [0, ...weights.slice(1)],
        },
        migrate: false,
        check: true,
      })
    ).toThrow('Expected FSRS4.5 weights within model bounds.')
    expect(
      FSRS4Dot5Model.create({ config: { weights: [...weights, 1, 1] } }).config
        .weights
    ).toEqual(weights)
    expect(
      FSRS4Dot5Model.create({
        config: {
          weights,
          enableShortTerm: true,
        } as never,
      }).config
    ).toEqual(model.config)
  })

  it('exposes the FSRS-4.5 model runtime methods', () => {
    const model = FSRS4Dot5Model.create({
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
})
