import {
  ConvertStepUnitToMinutes,
  DefaultLearningStepsStrategy,
  generatorParameters,
  Rating,
  State,
} from '../../src/fsrs'

describe('ConvertStepUnitToMinutes', () => {
  it('1m', () => {
    expect(ConvertStepUnitToMinutes('1m')).toBe(1)
  })
  it('1h', () => {
    expect(ConvertStepUnitToMinutes('1h')).toBe(60)
  })
  it('1d', () => {
    expect(ConvertStepUnitToMinutes('1d')).toBe(1440)
  })
  it('sd', () => {
    expect(() => {
      // @ts-expect-error test invalid step
      ConvertStepUnitToMinutes('sd')
    }).toThrow()
  })

  it('2g', () => {
    expect(() => {
      // @ts-expect-error test invalid step
      ConvertStepUnitToMinutes('2g')
    }).toThrow()
  })
})

describe('LearningStepsStrategy', () => {
  it(`learning_steps = ['1m', '10m']`, () => {
    const params = generatorParameters({
      learning_steps: ['1m', '10m'],
    })

    let result = DefaultLearningStepsStrategy(params, State.New, 0)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 6, next_step: 0 },
      [Rating.Good]: { scheduled_minutes: 10, next_step: 1 },
    })

    result = DefaultLearningStepsStrategy(params, State.Learning, 1)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 6, next_step: 1 },
    })

    result = DefaultLearningStepsStrategy(params, State.Learning, 0)
    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 6, next_step: 0 },
      [Rating.Good]: { scheduled_minutes: 10, next_step: 1 },
    })
  })

  it(`relearning_steps = ['10m']`, () => {
    const params = generatorParameters({
      relearning_steps: ['10m'],
    })

    let result = DefaultLearningStepsStrategy(params, State.Review, 0)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 10, next_step: 0 },
    })

    result = DefaultLearningStepsStrategy(params, State.Relearning, 0)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 10, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 15, next_step: 0 },
    })

    result = DefaultLearningStepsStrategy(params, State.Relearning, 1)

    expect(result).toEqual({})

    result = DefaultLearningStepsStrategy(
      params,
      State.Relearning,
      Number.MAX_VALUE
    )

    expect(result).toEqual({})
  })
})
