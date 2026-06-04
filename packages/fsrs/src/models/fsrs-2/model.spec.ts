import { describe, expect, it } from 'vitest'
import { type Grade, Rating } from '../../models.js'
import { FSRS2_DEFAULT_WEIGHTS } from './constants.js'
import { FSRS2Model } from './model.js'

describe('FSRS2Model', () => {
  it('binds step, forgetting curve, interval, and forward to FSRS-2 algorithm', () => {
    const model = FSRS2Model({
      weights: FSRS2_DEFAULT_WEIGHTS,
      enableShortTerm: true,
    })

    const initial = model.step({
      memoryState: null,
      rating: Rating.Easy,
      elapsedDays: 0,
    })

    expect(initial).toEqual({ stability: 4, difficulty: 1 })
    expect(model.nextInterval(initial, 0.9)).toBe(4)
    expect(model.forgettingCurve(initial, 4)).toBe(0.9)

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
