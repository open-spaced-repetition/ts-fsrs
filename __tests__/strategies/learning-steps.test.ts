import {
  ConvertStepUnitToMinutes,
  DefaultLearningStepsStrategy,
  generatorParameters,
  Rating,
  State,
} from '../../src/fsrs'
import { GradeType, StepUnit } from '../../src/fsrs/models'

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

  it(`learning_steps = [{ Again: '5m', Hard: '10m', Good: '15m' }]`, () => {
    const step1: { [K in GradeType]?: StepUnit } = {
      Again: '1m',
      Hard: '10m',
      Good: '15m',
    }
    const params = generatorParameters({
      learning_steps: [step1],
    })

    let result = DefaultLearningStepsStrategy(params, State.New, 0)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 10, next_step: 0 },
      [Rating.Good]: { scheduled_minutes: 15, next_step: 1 },
    })

    result = DefaultLearningStepsStrategy(params, State.Learning, 1)

    expect(result).toEqual({})
  })

  it(`learning_steps = [{ Again: '5m', Hard: '10m', Good: '15m' }]`, () => {
    const step1: { [K in GradeType]?: StepUnit } = {
      Again: '1m',
      Hard: '10m',
      Good: '15m',
    }
    const step2: { [K in GradeType]?: StepUnit } = {
      Again: '1m',
      Hard: '7m',
      Good: '30m',
    }
    const params = generatorParameters({
      learning_steps: [step1, step2],
    })

    let result = DefaultLearningStepsStrategy(params, State.New, 0)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 10, next_step: 0 },
      [Rating.Good]: { scheduled_minutes: 15, next_step: 1 },
    })

    result = DefaultLearningStepsStrategy(params, State.Learning, 1)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 7, next_step: 1 },
      [Rating.Good]: { scheduled_minutes: 30, next_step: 2 },
    })
  })

  it(`learning_steps = [{ Again: '5m', Hard: '10m', Good: '15m' }]`, () => {
    const step1: { [K in GradeType]?: StepUnit } = {
      Again: '1m',
      Hard: '10m',
      Good: '15m',
    }
    const params = generatorParameters({
      learning_steps: [step1],
    })

    let result = DefaultLearningStepsStrategy(params, State.New, 0)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 10, next_step: 0 },
      [Rating.Good]: { scheduled_minutes: 15, next_step: 1 },
    })

    result = DefaultLearningStepsStrategy(params, State.Learning, 1)

    expect(result).toEqual({})
  })

  it(`learning_steps = [
    { Again: '5m', Hard: '10m', Good: '15m' }, 
    { Again: '1m', Hard: '7m', Good: '15m' }]`, () => {
    const step1: { [K in GradeType]?: StepUnit } = {
      Again: '1m',
      Hard: '10m',
      Good: '15m',
    }
    const step2: { [K in GradeType]?: StepUnit } = {
      Again: '1m',
      Hard: '7m',
      Good: '30m',
    }
    const params = generatorParameters({
      learning_steps: [step1, step2],
    })

    let result = DefaultLearningStepsStrategy(params, State.New, 0)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 10, next_step: 0 },
      [Rating.Good]: { scheduled_minutes: 15, next_step: 1 },
    })

    result = DefaultLearningStepsStrategy(params, State.Learning, 1)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 7, next_step: 1 },
      [Rating.Good]: { scheduled_minutes: 30, next_step: 2 },
    })
  })

  it(`learning_steps = [
    '1m', 
    { Again: '1m', Hard: '2m', Good: '15m' }]`, () => {
    const step1: StepUnit = '1m'
    const step2: { [K in GradeType]?: StepUnit } = {
      Again: '1m',
      Hard: '2m',
      Good: '15m',
    }
    const params = generatorParameters({
      learning_steps: [step1, step2],
    })

    let result = DefaultLearningStepsStrategy(params, State.New, 0)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 8, next_step: 0 },
      [Rating.Good]: { scheduled_minutes: 15, next_step: 1 },
    })

    result = DefaultLearningStepsStrategy(params, State.Learning, 1)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 2, next_step: 1 },
      [Rating.Good]: { scheduled_minutes: 15, next_step: 2 },
    })
  })

  it(`learning_steps = [
    '1m', 
    { Again: '1m', Hard: '2m', Good: '15m' }]`, () => {
    const step1: StepUnit = '1m'
    const step2: { [K in GradeType]?: StepUnit } = {
      Again: '1m',
      Hard: '2m',
      Good: '15m',
    }
    const params = generatorParameters({
      learning_steps: [step1, step2],
    })

    let result = DefaultLearningStepsStrategy(params, State.New, 0)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 8, next_step: 0 },
      [Rating.Good]: { scheduled_minutes: 15, next_step: 1 },
    })

    result = DefaultLearningStepsStrategy(params, State.Learning, 1)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 2, next_step: 1 },
      [Rating.Good]: { scheduled_minutes: 15, next_step: 2 },
    })
  })
})

describe('relearning_steps', () => {
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

  it(`relearning_steps = ['10m', '20m']`, () => {
    const params = generatorParameters({
      relearning_steps: ['10m', '20m'],
    })

    let result = DefaultLearningStepsStrategy(params, State.Review, 0)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 10, next_step: 0 },
    })

    result = DefaultLearningStepsStrategy(params, State.Relearning, 0)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 10, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 15, next_step: 0 },
      [Rating.Good]: { scheduled_minutes: 20, next_step: 1 },
    })

    result = DefaultLearningStepsStrategy(params, State.Relearning, 1)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 10, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 15, next_step: 1 },
    })

    result = DefaultLearningStepsStrategy(params, State.Relearning, 2)
    expect(result).toEqual({})
  })

  it(`relearning_steps = [{ Again: '5m', Hard: '10m', Good: '15m' }]`, () => {
    const step1: { [K in GradeType]?: StepUnit } = {
      Again: '1m',
      Hard: '10m',
      Good: '15m',
    }
    const params = generatorParameters({
      relearning_steps: [step1],
    })

    let result = DefaultLearningStepsStrategy(params, State.Review, 0)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
    })

    result = DefaultLearningStepsStrategy(params, State.Relearning, 0)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 10, next_step: 0 },
      [Rating.Good]: { scheduled_minutes: 15, next_step: 1 },
    })

    result = DefaultLearningStepsStrategy(params, State.Relearning, 1)

    expect(result).toEqual({})
  })

  it(`relearning_steps = [
    { Again: '5m', Hard: '10m', Good: '15m' }, 
    { Again: '1m', Hard: '7m', Good: '15m' }]`, () => {
    const step1: { [K in GradeType]?: StepUnit } = {
      Again: '1m',
      Hard: '10m',
      Good: '15m',
    }
    const step2: { [K in GradeType]?: StepUnit } = {
      Again: '1m',
      Hard: '7m',
      Good: '30m',
    }
    const params = generatorParameters({
      relearning_steps: [step1, step2],
    })

    let result = DefaultLearningStepsStrategy(params, State.Review, 0)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
    })

    result = DefaultLearningStepsStrategy(params, State.Relearning, 0)
    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 10, next_step: 0 },
      [Rating.Good]: { scheduled_minutes: 15, next_step: 1 },
    })
    result = DefaultLearningStepsStrategy(params, State.Relearning, 1)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 7, next_step: 1 },
      [Rating.Good]: { scheduled_minutes: 30, next_step: 2 },
    })
  })

  it(`relearning_steps = [
    '1m', 
    { Again: '1m', Hard: '2m', Good: '15m' }]`, () => {
    const step1: StepUnit = '1m'
    const step2: { [K in GradeType]?: StepUnit } = {
      Again: '1m',
      Hard: '2m',
      Good: '15m',
    }
    const params = generatorParameters({
      relearning_steps: [step1, step2],
    })

    let result = DefaultLearningStepsStrategy(params, State.Review, 0)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
    })
    result = DefaultLearningStepsStrategy(params, State.Relearning, 0)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 8, next_step: 0 },
      [Rating.Good]: { scheduled_minutes: 15, next_step: 1 },
    })

    result = DefaultLearningStepsStrategy(params, State.Relearning, 1)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 2, next_step: 1 },
      [Rating.Good]: { scheduled_minutes: 15, next_step: 2 },
    })
  })

  it(`relearning_steps = [
    '1m', 
    { Again: '1m', Hard: '2m', Good: '15m' }]`, () => {
    const step1: StepUnit = '1m'
    const step2: { [K in GradeType]?: StepUnit } = {
      Again: '1m',
      Hard: '2m',
      Good: '15m',
    }
    const params = generatorParameters({
      relearning_steps: [step1, step2],
    })

    let result = DefaultLearningStepsStrategy(params, State.Review, 0)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
    })

    result = DefaultLearningStepsStrategy(params, State.Relearning, 0)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 8, next_step: 0 },
      [Rating.Good]: { scheduled_minutes: 15, next_step: 1 },
    })

    result = DefaultLearningStepsStrategy(params, State.Relearning, 1)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 2, next_step: 1 },
      [Rating.Good]: { scheduled_minutes: 15, next_step: 2 },
    })
  })

  it(`relearning_steps = [
    { Again: '1m', Hard: '2m', Good: '15m' }]`, () => {
    const step1: { [K in GradeType]?: StepUnit } = {
      Again: '1m',
      Hard: '2m',
      Good: '15m',
    }
    const params = generatorParameters({
      relearning_steps: [step1],
    })

    let result = DefaultLearningStepsStrategy(params, State.Review, 0)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
    })

    result = DefaultLearningStepsStrategy(params, State.Relearning, 0)

    expect(result).toEqual({
      [Rating.Again]: { scheduled_minutes: 1, next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: 2, next_step: 0 },
      [Rating.Good]: { scheduled_minutes: 15, next_step: 1 },
    })

    result = DefaultLearningStepsStrategy(params, State.Relearning, 1)

    expect(result).toEqual({})
  })
})
