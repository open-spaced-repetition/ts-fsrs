import { type FSRSState, type Grade, Grades, Rating } from 'ts-fsrs'
import {
  checkFSRS4Dot5Parameters,
  clipFSRS4Dot5Parameters,
  FSRS4Dot5_DECAY,
  FSRS4Dot5_DEFAULT_WEIGHTS,
  FSRS4Dot5_FACTOR,
  FSRS4Dot5_MODEL_BOUNDS,
  FSRS4Dot5Algorithm,
  FSRS4Dot5Model,
  forgettingCurve,
  migrateFSRS4Dot5Parameters,
} from 'ts-fsrs/models/fsrs-4dot5'

describe('FSRS-4.5 model', () => {
  const weights = FSRS4Dot5_DEFAULT_WEIGHTS

  it('exports FSRS-4.5 constants and default parameters', () => {
    expect(FSRS4Dot5_DECAY).toBe(0.5)
    expect(FSRS4Dot5_FACTOR).toBe(19 / 81)
    expect(weights).toEqual([
      0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474,
      0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755,
    ])
  })

  it('calculates the FSRS-4.5 forgetting curve', () => {
    expect([0, 1, 2, 3].map((t) => forgettingCurve(t, 1))).toEqual([
      1, 0.9, 0.82502865, 0.76613088,
    ])
  })

  it('calculates initial memory states with 17 FSRS-4.5 weights', () => {
    const algorithm = new FSRS4Dot5Algorithm(weights, FSRS4Dot5_MODEL_BOUNDS)

    expect(
      () => new FSRS4Dot5Algorithm(weights.slice(0, 16), FSRS4Dot5_MODEL_BOUNDS)
    ).toThrow('FSRS4Dot5Algorithm requires exactly 17 weights')
    expect(Grades.map((rating) => algorithm.init_stability(rating))).toEqual([
      0.4872, 1.4003, 3.7145, 13.8206,
    ])
    expect(Grades.map((rating) => algorithm.init_difficulty(rating))).toEqual([
      7.6214, 6.3916, 5.1618, 3.932,
    ])
  })

  it('uses the FSRS-4.5 parameter bounds from the reference implementation', () => {
    expect(
      clipFSRS4Dot5Parameters(Array(17).fill(Number.POSITIVE_INFINITY))
    ).toEqual([
      100, 100, 100, 100, 10, 5, 5, 0.8, 6, 0.8, 5, 6, 0.4, 0.9, 4, 1, 10,
    ])
    expect(migrateFSRS4Dot5Parameters()).toEqual(weights)
    expect(() => migrateFSRS4Dot5Parameters(Array(19).fill(1))).toThrow(
      'Invalid parameters length "19", expected 17.'
    )
    expect(() => checkFSRS4Dot5Parameters([0, ...weights.slice(1)])).toThrow(
      'Expected FSRS4.5 weights within model bounds.'
    )
  })

  it('caps post-lapse stability at the previous stability', () => {
    const algorithm = new FSRS4Dot5Algorithm(weights, FSRS4Dot5_MODEL_BOUNDS)
    const state = algorithm.next_state(
      { difficulty: 1, stability: 0.1 },
      1,
      Rating.Again
    )

    expect(state.stability).toBe(0.1)
    expect(
      algorithm.next_state({ difficulty: 5, stability: 5 }, 1, Rating.Manual)
    ).toEqual({ difficulty: 5, stability: 5 })
    expect(() => algorithm.next_state(null, -1, Rating.Good)).toThrow(
      'Invalid delta_t "-1"'
    )
    expect(() => algorithm.next_state(null, 0, 5)).toThrow('Invalid grade "5"')
    expect(() =>
      algorithm.next_state({ difficulty: 0.5, stability: 0.1 }, 1, Rating.Good)
    ).toThrow('Invalid memory state { difficulty: 0.5, stability: 0.1 }')
  })

  it('steps and forwards review history without short-term FSRS-5 behavior', () => {
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
    const easyInitialState = model.step({
      memoryState: null,
      rating: Rating.Easy,
      elapsedDays: 0,
    })

    expect(easyInitialState).toEqual({ difficulty: 3.932, stability: 13.8206 })
    expect(model.nextInterval(easyInitialState, 0.9)).toBe(14)
    expect(model.forgettingCurve(easyInitialState, 14)).toBe(0.89889221)
    expect(() => model.nextInterval(easyInitialState, 0)).toThrow(
      'Desired retention rate should be in the range (0,1]'
    )

    const ignoredShortTermModel = FSRS4Dot5Model.create({
      config: {
        weights,
        enableShortTerm: true,
      } as never,
    })
    const ratings: Grade[] = [
      Rating.Again,
      Rating.Good,
      Rating.Good,
      Rating.Good,
      Rating.Good,
      Rating.Good,
    ]
    const intervals = [0, 0, 1, 3, 8, 21]
    const expected: FSRSState[] = [
      { difficulty: 7.6214, stability: 0.4872 },
      { difficulty: 7.5451524, stability: 0.4872 },
      { difficulty: 7.47126848, stability: 2.46614852 },
      { difficulty: 7.39967496, stability: 7.71265273 },
      { difficulty: 7.33030084, stability: 20.14315368 },
      { difficulty: 7.26307731, stability: 49.29635106 },
    ]

    let state: FSRSState | null = null
    const states: FSRSState[] = []
    for (const [index, rating] of ratings.entries()) {
      state = model.step({
        memoryState: state,
        elapsedDays: intervals[index],
        rating,
      })
      states.push(state)
    }

    expect(ignoredShortTermModel.config).toEqual(model.config)
    expect(states).toEqual(expected)
    expect(
      model.forward({
        history: ratings.map((rating, index) => ({
          rating,
          deltaT: intervals[index],
        })),
      })
    ).toEqual(expected)
  })
})
