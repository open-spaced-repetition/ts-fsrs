import { describe, expect, it } from 'vitest'
import { type Grade, Rating } from '../../models.js'
import { FSRS3Algorithm } from './algorithm.js'
import { FSRS3_DEFAULT_WEIGHTS } from './constants.js'
import { FSRS3Model } from './model.js'
import { migrateFSRS3Parameters } from './parameters.js'

describe('FSRS3Model', () => {
  it('returns the default empty memory state', () => {
    expect(
      FSRS3Model.defaultValue.memoryState({
        config: {
          weights: FSRS3_DEFAULT_WEIGHTS,
        },
      })
    ).toEqual({ stability: 0, difficulty: 0 })
  })

  it('binds step, forgetting curve, interval, and forward to FSRS-3 algorithm', () => {
    const model = FSRS3Model.create({
      config: {
        weights: FSRS3_DEFAULT_WEIGHTS,
      },
    })

    const initial = model.step({
      memoryState: null,
      rating: Rating.Good,
      elapsedDays: 0,
    })

    expect(initial).toEqual({ stability: 4.4073, difficulty: 4.8527 })
    expect(model.nextInterval(initial, 0.9)).toBe(4)
    expect(model.forgettingCurve(initial, 1)).toBe(0.97637757)

    const history: { rating: Grade; deltaT: number }[] = [
      { rating: Rating.Good, deltaT: 0 },
      { rating: Rating.Good, deltaT: 1 },
    ]

    expect(model.forward({ history })).toEqual([
      { difficulty: 4.8527, stability: 4.4073 },
      { difficulty: 4.8527, stability: 7.4609786 },
    ])
  })

  it('exposes the underlying algorithm instance', () => {
    const model = FSRS3Model.create({
      config: {
        weights: FSRS3_DEFAULT_WEIGHTS,
      },
    })

    expect(model.algorithm).toBeInstanceOf(FSRS3Algorithm)
  })

  it('validates config with schema before creating model runtime', () => {
    expect(() =>
      FSRS3Model.create({
        config: {
          weights: 'invalid',
        } as never,
        migrate: false,
        check: false,
      })
    ).toThrow()
  })

  it('migrates FSRS-3 weights when requested', () => {
    const weights = Array.from(FSRS3_DEFAULT_WEIGHTS)
    weights[0] = 0

    const model = FSRS3Model.create({
      config: { weights },
      migrate: true,
    })

    expect(model.config.weights).toEqual(migrateFSRS3Parameters(weights))
  })

  it('bypasses create-time parsing when requested', () => {
    const config = {
      weights: Array.from(FSRS3_DEFAULT_WEIGHTS),
    }

    const model = FSRS3Model.create({ config, bypass: true })

    expect(model.config).toBe(config)
  })

  it('skips parameter bounds checks when requested', () => {
    const weights = Array.from(FSRS3_DEFAULT_WEIGHTS)
    weights[0] = 0

    const model = FSRS3Model.create({
      config: { weights },
      migrate: false,
      check: false,
    })

    expect(model.config.weights[0]).toBe(0)
  })

  it('checks parameter bounds when requested', () => {
    const weights = Array.from(FSRS3_DEFAULT_WEIGHTS)
    weights[0] = 0

    expect(() =>
      FSRS3Model.create({
        config: { weights },
        migrate: false,
        check: true,
      })
    ).toThrow('Expected FSRS3 weights within model bounds.')
  })
})
