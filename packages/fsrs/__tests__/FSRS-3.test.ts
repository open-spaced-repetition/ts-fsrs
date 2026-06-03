import { Rating } from 'ts-fsrs'
import {
  FSRS3_DEFAULT_WEIGHTS,
  FSRS3_MODEL_BOUNDS,
  FSRS3Algorithm,
  FSRS3Model,
  forgettingCurve,
} from 'ts-fsrs/models/fsrs-3'

describe('FSRS-3 model', () => {
  const w = FSRS3_DEFAULT_WEIGHTS

  it('uses FSRS-3 forgetting curve and interval formula', () => {
    const algorithm = new FSRS3Algorithm(w, FSRS3_MODEL_BOUNDS)
    const state = { stability: 10, difficulty: 5 }

    expect(forgettingCurve(10, 10)).toBe(0.9)
    expect(algorithm.forgetting_curve(5, 10)).toBeCloseTo(Math.pow(0.9, 0.5), 8)
    expect(algorithm.next_interval(state.stability, 0.9)).toBe(10)
    expect(algorithm.next_interval(state.stability, 1)).toBe(1)
  })

  it('initializes memory state from FSRS-3 linear formulas', () => {
    const algorithm = new FSRS3Algorithm(w, FSRS3_MODEL_BOUNDS)

    expect(algorithm.next_state(null, 0, Rating.Again)).toEqual({
      difficulty: 7.2361,
      stability: 0.9605,
    })
    expect(algorithm.next_state(null, 0, Rating.Easy)).toEqual({
      difficulty: 3.661,
      stability: 6.1307,
    })
  })

  it('steps review state through FSRS-3 recall and forget formulas', () => {
    const algorithm = new FSRS3Algorithm(w, FSRS3_MODEL_BOUNDS)
    const memoryState = { stability: 5, difficulty: 5 }

    expect(algorithm.next_state(memoryState, 5, Rating.Good)).toEqual({
      difficulty: 4.99155971,
      stability: 19.62388865,
    })
    expect(algorithm.next_state(memoryState, 10, Rating.Again)).toEqual({
      difficulty: 7.43428395,
      stability: 3.21609132,
    })
  })

  it('implements the preview model interface', () => {
    const model = FSRS3Model({
      weights: w,
      enableShortTerm: true,
    })

    const states = model.forward({
      history: [
        { rating: Rating.Good, deltaT: 0 },
        { rating: Rating.Good, deltaT: 1 },
      ],
    })

    expect(states).toEqual([
      { difficulty: 4.8527, stability: 4.4073 },
      { difficulty: 4.8527, stability: 7.4609786 },
    ])
    expect(model.nextInterval(states[1], 0.9)).toBe(7)
    expect(model.forgettingCurve(states[1], 1)).toBeCloseTo(0.9859777, 8)
  })
})
