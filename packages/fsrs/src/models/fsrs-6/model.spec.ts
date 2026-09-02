import { describe, expect, it } from 'vitest'
import { FSRS5_DEFAULT_WEIGHTS } from '../fsrs-5/constants.js'
import { FSRS6Algorithm } from './algorithm.js'
import { FSRS6_DEFAULT_WEIGHTS } from './constants.js'
import { FSRS6Model } from './model.js'
import { migrateFSRS6Parameters } from './parameters.js'

describe('FSRS6Model', () => {
  it('exposes the underlying algorithm instance', () => {
    const model = FSRS6Model.create({
      config: {
        weights: FSRS6_DEFAULT_WEIGHTS,
        enableShortTerm: true,
        numRelearningSteps: 0,
      },
    })

    expect(model.algorithm).toBeInstanceOf(FSRS6Algorithm)
  })

  it('validates config with schema before creating model runtime', () => {
    expect(() =>
      FSRS6Model.create({
        config: {
          weights: FSRS6_DEFAULT_WEIGHTS,
          enableShortTerm: true,
          numRelearningSteps: '1',
        } as never,
      })
    ).toThrow()
  })

  it.each([
    [true, 0.01],
    [false, 0],
  ])('clips migrated FSRS-5 weights when enableShortTerm=%s', (enableShortTerm, expectedW19) => {
    const weights = Array.from(FSRS5_DEFAULT_WEIGHTS)
    const model = FSRS6Model.create({
      config: {
        weights,
        enableShortTerm,
        numRelearningSteps: 0,
      },
    })

    expect(model.config.weights[19]).toBe(expectedW19)
  })

  it('bypasses parameter clipping when requested', () => {
    const config = {
      weights: migrateFSRS6Parameters(FSRS5_DEFAULT_WEIGHTS),
      enableShortTerm: true,
      numRelearningSteps: 0,
    }

    const model = FSRS6Model.create({ config, bypass: true })

    expect(model.config).toBe(config)
    expect(model.config.weights[19]).toBe(0)
  })

  it('can migrate without clipping or checking', () => {
    const model = FSRS6Model.create({
      config: {
        weights: FSRS5_DEFAULT_WEIGHTS,
        enableShortTerm: true,
        numRelearningSteps: 0,
      },
      clip: false,
      check: false,
    })

    expect(model.config.weights).toHaveLength(21)
    expect(model.config.weights[19]).toBe(0)
  })

  it('checks parameter bounds when requested', () => {
    const weights = Array.from(FSRS6_DEFAULT_WEIGHTS)
    weights[0] = 0

    expect(() =>
      FSRS6Model.create({
        config: {
          weights,
          enableShortTerm: true,
          numRelearningSteps: 0,
        },
        migrate: false,
        clip: false,
        check: true,
      })
    ).toThrow('Expected FSRS6 weights within model bounds.')
  })
})
