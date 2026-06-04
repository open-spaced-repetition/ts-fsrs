import { describe, expect, it } from 'vitest'
import { type Grade, Rating } from '../../models.js'
import { FSRS5_DEFAULT_WEIGHTS } from './constants.js'
import { FSRS5Model } from './model.js'

describe('FSRS5Model', () => {
  it('binds step, forgetting curve, interval, and forward to FSRS-5 algorithm', () => {
    const model = FSRS5Model({
      weights: FSRS5_DEFAULT_WEIGHTS,
      enableShortTerm: true,
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
})
