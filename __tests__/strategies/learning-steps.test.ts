import {
  BasicLearningStepsStrategy,
  ConvertStepUnitToMinutes,
  createEmptyCard,
  fsrs,
  generatorParameters,
  Grades,
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

describe('learning_steps', () => {
  it(`learning_steps = ['1m', '10m']`, () => {
    const params = generatorParameters({
      learning_steps: ['1m', '10m'],
    })

    let result = BasicLearningStepsStrategy(params, State.New, 0)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 6, next_step: 0 },
      [Rating.Good]: { scheduled_minutes: 10, next_step: 1 },
    })

    result = BasicLearningStepsStrategy(params, State.Learning, 0)
    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 6, next_step: 0 },
      [Rating.Good]: { scheduled_minutes: 10, next_step: 1 },
    })

    result = BasicLearningStepsStrategy(params, State.Learning, 1)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 6, next_step: 1 },
    })
  })
})

describe('relearning_steps', () => {
  it(`relearning_steps = ['10m']`, () => {
    const params = generatorParameters({
      relearning_steps: ['10m'],
    })

    let result = BasicLearningStepsStrategy(params, State.Review, 0)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 10, next_step: 0 },
    })

    result = BasicLearningStepsStrategy(params, State.Relearning, 0)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 10, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 15, next_step: 0 },
    })

    result = BasicLearningStepsStrategy(params, State.Relearning, 1)

    expect(result).toEqual({})

    result = BasicLearningStepsStrategy(
      params,
      State.Relearning,
      Number.MAX_VALUE
    )

    expect(result).toEqual({})
  })

  it(`relearning_steps = ['10m', '20m']`, () => {
    const params = generatorParameters({
      relearning_steps: ['10m', '20m'],
    })

    let result = BasicLearningStepsStrategy(params, State.Review, 0)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 10, next_step: 0 },
    })

    result = BasicLearningStepsStrategy(params, State.Relearning, 0)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 10, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 15, next_step: 0 },
      [Rating.Good]: { scheduled_minutes: 20, next_step: 1 },
    })

    result = BasicLearningStepsStrategy(params, State.Relearning, 1)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 10, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 15, next_step: 1 },
    })

    result = BasicLearningStepsStrategy(params, State.Relearning, 2)
    expect(result).toEqual({})
  })
})

describe('integrated to FSRS', () => {
  const f = fsrs({
    learning_steps: ['1m', '10m'],
    relearning_steps: ['10m'],
  })
  const now = new Date(2022, 11, 29, 12, 30, 0, 0)

  it('First learning step', () => {
    const card = createEmptyCard(now)
    const record = f.repeat(card, now)
    expect(record[Rating.Again].card.learning_steps).toEqual(0)
    expect(record[Rating.Again].card.due.getTime() - now.getTime()).toEqual(
      1000 * 60 * 1 // 1m
    )

    expect(record[Rating.Hard].card.learning_steps).toEqual(0)
    expect(record[Rating.Hard].card.due.getTime() - now.getTime()).toEqual(
      1000 * 60 * 6 // 6m=(1+10)/2
    )

    expect(record[Rating.Good].card.learning_steps).toEqual(1)
    expect(record[Rating.Good].card.due.getTime() - now.getTime()).toEqual(
      1000 * 60 * 10 // 10m
    )
  })
})
