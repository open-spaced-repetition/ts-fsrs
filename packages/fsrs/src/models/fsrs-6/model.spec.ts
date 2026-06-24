import { describe, expect, it } from 'vitest'
import { FSRS6_DEFAULT_WEIGHTS } from './constants.js'
import { FSRS6Model } from './model.js'

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
})
