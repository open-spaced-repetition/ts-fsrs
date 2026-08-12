import { type Grade, Rating } from '@open-spaced-repetition/srs-kit'
import { describe, expect, it } from 'vitest'
import { FSRS5Algorithm } from './algorithm.js'
import { FSRS5_DEFAULT_WEIGHTS } from './constants.js'
import { FSRS5Model } from './model.js'
import { migrateFSRS5Parameters } from './parameters.js'

describe('FSRS5Model', () => {
  it('returns the default empty memory state', () => {
    expect(
      FSRS5Model.defaultValue.memoryState({
        config: {
          weights: FSRS5_DEFAULT_WEIGHTS,
          enableShortTerm: true,
        },
      })
    ).toEqual({ stability: 0, difficulty: 0 })
  })

  it('binds step, forgetting curve, interval, and forward to FSRS-5 algorithm', () => {
    const model = FSRS5Model.create({
      config: {
        weights: FSRS5_DEFAULT_WEIGHTS,
        enableShortTerm: true,
      },
    })

    const initial = model.step({
      memoryState: null,
      rating: Rating.Easy,
      elapsedDays: 0,
    })

    expect(initial).toEqual({ stability: 15.69105, difficulty: 3.22450159 })
    expect(model.nextInterval(initial, 0.9)).toBe(16)
    expect(model.forgettingCurve(initial, 16)).toBe(0.89832125)

    const history: { rating: Grade; deltaT: number }[] = [
      { rating: Rating.Again, deltaT: 0 },
      { rating: Rating.Good, deltaT: 0 },
      { rating: Rating.Good, deltaT: 1 },
    ]

    expect(model.forward({ history }).at(-1)).toEqual(
      model.step({
        memoryState: model.step({
          memoryState: model.step({
            memoryState: null,
            rating: Rating.Again,
            elapsedDays: 0,
          }),
          rating: Rating.Good,
          elapsedDays: 0,
        }),
        rating: Rating.Good,
        elapsedDays: 1,
      })
    )
  })

  it('exposes the underlying algorithm instance', () => {
    const model = FSRS5Model.create({
      config: {
        weights: FSRS5_DEFAULT_WEIGHTS,
        enableShortTerm: true,
      },
    })

    expect(model.algorithm).toBeInstanceOf(FSRS5Algorithm)
  })

  it('validates config with schema before creating model runtime', () => {
    expect(() =>
      FSRS5Model.create({
        config: {
          weights: FSRS5_DEFAULT_WEIGHTS,
          enableShortTerm: 'yes',
        } as never,
      })
    ).toThrow()
  })

  it('migrates FSRS-4.5 weights when requested', () => {
    const weights = FSRS5_DEFAULT_WEIGHTS.slice(0, 17)
    const model = FSRS5Model.create({
      config: { weights, enableShortTerm: true },
      migrate: true,
    })

    expect(model.config.weights).toEqual(migrateFSRS5Parameters(weights))
  })

  it('bypasses create-time parsing when requested', () => {
    const config = {
      weights: Array.from(FSRS5_DEFAULT_WEIGHTS),
      enableShortTerm: true,
    }

    const model = FSRS5Model.create({ config, bypass: true })

    expect(model.config).toBe(config)
  })

  it('skips parameter bounds checks when requested', () => {
    const weights = Array.from(FSRS5_DEFAULT_WEIGHTS)
    weights[0] = 0

    const model = FSRS5Model.create({
      config: { weights, enableShortTerm: true },
      migrate: false,
      check: false,
    })

    expect(model.config.weights[0]).toBe(0)
  })

  it('checks parameter bounds when requested', () => {
    const weights = Array.from(FSRS5_DEFAULT_WEIGHTS)
    weights[0] = 0

    expect(() =>
      FSRS5Model.create({
        config: { weights, enableShortTerm: true },
        migrate: false,
        check: true,
      })
    ).toThrow('Expected FSRS5 weights within model bounds.')
  })
})
