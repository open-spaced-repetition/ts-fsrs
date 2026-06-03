import { type FSRSState, Rating } from 'ts-fsrs'
import {
  FSRS4_DEFAULT_WEIGHTS,
  FSRS4Model,
  forgettingCurve,
} from 'ts-fsrs/models/fsrs-4'

describe('FSRS-4 model', () => {
  const weights = [...FSRS4_DEFAULT_WEIGHTS]
  const model = FSRS4Model({ weights, enableShortTerm: true })

  it('uses FSRS-4 default weights', () => {
    expect(FSRS4_DEFAULT_WEIGHTS).toEqual([
      0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05,
      0.34, 1.26, 0.29, 2.61,
    ])
  })

  it('calculates the FSRS-4 forgetting curve and interval modifier', () => {
    const state: FSRSState = { stability: 10, difficulty: 5 }

    expect(forgettingCurve(10, 10)).toBe(0.9)
    expect(model.forgettingCurve(state, 10)).toBe(0.9)
    expect(model.nextInterval(state, 0.9)).toBe(10)
    expect(model.nextInterval(state, 0.8)).toBe(23)
  })

  it('calculates initial memory states with FSRS-4 formulas', () => {
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
      stability: 0.6,
    })
    expect(
      model.step({ memoryState: null, rating: Rating.Good, elapsedDays: 0 })
    ).toEqual({
      difficulty: 4.93,
      stability: 2.4,
    })
    expect(
      model.step({ memoryState: null, rating: Rating.Easy, elapsedDays: 0 })
    ).toEqual({
      difficulty: 3.99,
      stability: 5.8,
    })
  })

  it('calculates review memory states with FSRS-4 formulas', () => {
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

    expect(reviewed.stability).toBeCloseTo(7.14163331, 8)
    expect(reviewed.difficulty).toBeCloseTo(4.93, 8)
    expect(lapsed.stability).toBeCloseTo(2.33126156, 8)
    expect(lapsed.difficulty).toBeCloseTo(6.6328, 8)
  })

  it('forwards review history', () => {
    const states = model.forward({
      history: [
        { rating: Rating.Good, deltaT: 0 },
        { rating: Rating.Good, deltaT: 2 },
        { rating: Rating.Again, deltaT: 6 },
      ],
    })

    expect(states.at(-1)).toEqual({
      difficulty: 6.6328,
      stability: 2.33126156,
    })
  })
})
