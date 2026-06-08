import {
  BasicLearningStepsStrategy,
  ConvertStepUnitToMinutes,
  createEmptyCard,
  dateDiffInDays,
  default_w,
  fsrs,
  generatorParameters,
  Rating,
  State,
} from 'ts-fsrs'

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
  it('should not create Rating.Good if next step is invalid', () => {
    const params = generatorParameters({
      learning_steps: ['1m', '0m'], // nextMin = null
    })
    const result = BasicLearningStepsStrategy(params, State.Learning, 0)
    expect(result[Rating.Good]).toBeUndefined()
  })

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

  it(`learning_steps = ['1m']`, () => {
    const params = generatorParameters({
      learning_steps: ['1m'],
    })

    let result = BasicLearningStepsStrategy(params, State.New, 0)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
      [Rating.Hard]: {
        scheduled_minutes: 2 /** Math.round(1*1.5) */,
        next_step: 0,
      },
    })

    result = BasicLearningStepsStrategy(params, State.Learning, 0)
    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 2, next_step: 0 },
    })

    result = BasicLearningStepsStrategy(params, State.Learning, 1)

    expect(result).toEqual({})
  })

  it(`learning_steps = ['-1m']`, () => {
    const params = generatorParameters({
      learning_steps: ['-1m'],
    })

    expect(() => BasicLearningStepsStrategy(params, State.New, 0)).toThrow()
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

  it(`relearning_steps = ['-1m']`, () => {
    const params = generatorParameters({
      relearning_steps: ['-1m'],
    })

    expect(() => BasicLearningStepsStrategy(params, State.Review, 0)).toThrow()
  })
})

describe('integrated into FSRS', () => {
  it('First learning step', () => {
    const f = fsrs({
      learning_steps: ['1m', '10m'],
      relearning_steps: ['10m'],
    })
    const now = new Date(2022, 11, 29, 12, 30, 0, 0)
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

    expect(record[Rating.Easy].card.learning_steps).toEqual(0)
    expect(dateDiffInDays(now, record[Rating.Easy].card.due)).toEqual(
      Math.floor(default_w[3])
    )
  })

  // A learning step that spans a full day or more graduates the card to Review
  // with day-level scheduled_days (see `learningStepMiddleware`). Custom
  // per-rating step strategies are no longer injectable, so the step lengths are
  // driven through `learning_steps`.
  describe('If a learning step’s delay exceeds 1 day', () => {
    it('graduates day-level steps to Review', () => {
      const f = fsrs({ learning_steps: ['5m', '1d', '3d'] })
      const now = new Date(2022, 11, 29, 12, 30, 0, 0)
      const card = createEmptyCard(now)
      const record = f.repeat(card, now)

      // Again: 5m sub-day step → stays in Learning.
      expect(record[Rating.Again].card.state).toEqual(State.Learning)
      expect(record[Rating.Again].card.learning_steps).toEqual(0)
      expect(record[Rating.Again].card.scheduled_days).toEqual(0)
      expect(record[Rating.Again].card.due.getTime() - now.getTime()).toEqual(
        1000 * 60 * 5 // 5m
      )

      // Good: next step is '1d' (1440m) → graduates to Review, 1 scheduled day.
      expect(record[Rating.Good].card.state).toEqual(State.Review)
      expect(record[Rating.Good].card.learning_steps).toEqual(1)
      expect(record[Rating.Good].card.scheduled_days).toEqual(1)
      expect(record[Rating.Good].card.due.getTime() - now.getTime()).toEqual(
        1000 * 60 * 1440 // 1d
      )
    })

    it('graduates multi-day steps to Review', () => {
      const f = fsrs({ learning_steps: ['5m', '3d'] })
      const now = new Date(2022, 11, 29, 12, 30, 0, 0)
      const card = createEmptyCard(now)
      const record = f.repeat(card, now)

      // Good: next step is '3d' (4320m) → graduates to Review, 3 scheduled days.
      expect(record[Rating.Good].card.state).toEqual(State.Review)
      expect(record[Rating.Good].card.learning_steps).toEqual(1)
      expect(record[Rating.Good].card.scheduled_days).toEqual(3)
      expect(record[Rating.Good].card.due.getTime() - now.getTime()).toEqual(
        1000 * 60 * 1440 * 3 // 3d
      )
    })
  })
})
