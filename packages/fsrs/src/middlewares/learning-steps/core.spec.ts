import { Rating, State } from '@open-spaced-repetition/srs-kit'
import { describe, expect, it } from 'vitest'
import { ConvertStepUnitToMinutes, calculateLearningSteps } from './core.js'
import type { LearningStepsConfig, StepUnit } from './types.js'

const config = (
  learningSteps: readonly StepUnit[] = [],
  relearningSteps: readonly StepUnit[] = []
): LearningStepsConfig => ({
  learningSteps,
  relearningSteps,
})

describe('ConvertStepUnitToMinutes', () => {
  it.each([
    ['1m', 1],
    ['1h', 60],
    ['1d', 1440],
    ['1.5m', 1.5],
    ['1.5h', 90],
    ['0.25d', 360],
    ['.5h', 30],
    ['1e2m', 100],
  ] as const)('converts %s to minutes', (step, expected) => {
    expect(ConvertStepUnitToMinutes(step)).toBe(expected)
  })

  it.each([
    'm',
    'sd',
    '1..5m',
    '-1m',
    '2g',
  ])('rejects invalid step %s', (step) => {
    expect(() => ConvertStepUnitToMinutes(step as StepUnit)).toThrow()
  })

  it('rejects non-string and non-finite numeric values', () => {
    expect(() => ConvertStepUnitToMinutes(1 as unknown as StepUnit)).toThrow()
    expect(() =>
      ConvertStepUnitToMinutes(`${'9'.repeat(400)}m` as StepUnit)
    ).toThrow()
  })
})

describe('calculateLearningSteps', () => {
  it('calculates a two-step learning schedule', () => {
    const params = config(['1m', '10m'])

    expect(calculateLearningSteps(params, State.New, 0)).toEqual({
      [Rating.Again]: { scheduledMinutes: 1, nextStep: 0 },
      [Rating.Hard]: { scheduledMinutes: 5.5, nextStep: 0 },
      [Rating.Good]: { scheduledMinutes: 10, nextStep: 1 },
    })
    expect(calculateLearningSteps(params, State.Learning, 1)).toEqual({
      [Rating.Again]: { scheduledMinutes: 1, nextStep: 0 },
      [Rating.Hard]: { scheduledMinutes: 5.5, nextStep: 1 },
    })
  })

  it('calculates a single learning step and graduates after it', () => {
    const params = config(['1m'])

    expect(calculateLearningSteps(params, State.Learning, 0)).toEqual({
      [Rating.Again]: { scheduledMinutes: 1, nextStep: 0 },
      [Rating.Hard]: { scheduledMinutes: 1.5, nextStep: 0 },
    })
    expect(calculateLearningSteps(params, State.Learning, 1)).toEqual({})
  })

  it('omits Good when the next step is zero', () => {
    expect(
      calculateLearningSteps(config(['1m', '0m']), State.Learning, 0)[
        Rating.Good
      ]
    ).toBeUndefined()
  })

  it('returns no schedule for empty or out-of-range steps', () => {
    expect(calculateLearningSteps(config(), State.New, 0)).toEqual({})
    expect(
      calculateLearningSteps(config([], ['10m']), State.Relearning, 1)
    ).toEqual({})
    expect(
      calculateLearningSteps(
        config([], ['10m']),
        State.Relearning,
        Number.MAX_VALUE
      )
    ).toEqual({})
  })

  it('uses the first step for a negative current step', () => {
    expect(calculateLearningSteps(config(['1m']), State.New, -1)).toEqual({
      [Rating.Again]: { scheduledMinutes: 1, nextStep: 0 },
      [Rating.Hard]: { scheduledMinutes: 1.5, nextStep: -1 },
      [Rating.Good]: { scheduledMinutes: 1, nextStep: 0 },
    })
  })

  it('only schedules Again when a review enters relearning', () => {
    expect(
      calculateLearningSteps(config([], ['10m', '20m']), State.Review, 0)
    ).toEqual({
      [Rating.Again]: { scheduledMinutes: 10, nextStep: 0 },
    })
  })

  it('calculates relearning steps independently from learning steps', () => {
    const params = config(['1m'], ['10m', '20m'])

    expect(calculateLearningSteps(params, State.Relearning, 0)).toEqual({
      [Rating.Again]: { scheduledMinutes: 10, nextStep: 0 },
      [Rating.Hard]: { scheduledMinutes: 15, nextStep: 0 },
      [Rating.Good]: { scheduledMinutes: 20, nextStep: 1 },
    })
    expect(calculateLearningSteps(params, State.Relearning, 1)).toEqual({
      [Rating.Again]: { scheduledMinutes: 10, nextStep: 0 },
      [Rating.Hard]: { scheduledMinutes: 15, nextStep: 1 },
    })
  })

  it('preserves decimal intervals for all grades', () => {
    expect(
      calculateLearningSteps(config(['1.5m', '2.5m']), State.New, 0)
    ).toEqual({
      [Rating.Again]: { scheduledMinutes: 1.5, nextStep: 0 },
      [Rating.Hard]: { scheduledMinutes: 2, nextStep: 0 },
      [Rating.Good]: { scheduledMinutes: 2.5, nextStep: 1 },
    })
  })
})
