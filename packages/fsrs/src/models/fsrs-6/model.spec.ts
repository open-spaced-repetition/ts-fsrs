import { describe, expect, it } from 'vitest'
import { FSRS5_DEFAULT_WEIGHTS } from '../fsrs-5/constants.js'
import { FSRS6_DEFAULT_WEIGHTS } from './constants.js'
import { FSRS6Model } from './model.js'
import { migrateFSRS6Parameters } from './parameters.js'

describe('FSRS6Model', () => {
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

  it('migrates FSRS-5 weights when requested', () => {
    const weights = Array.from(FSRS5_DEFAULT_WEIGHTS)
    const model = FSRS6Model.create({
      config: {
        weights,
        enableShortTerm: true,
        numRelearningSteps: 0,
      },
      migrate: true,
      check: false,
    })

    expect(model.config.weights).toEqual(
      migrateFSRS6Parameters(weights, 0, true)
    )
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
        check: true,
      })
    ).toThrow('Expected FSRS6 weights within model bounds.')
  })
})
