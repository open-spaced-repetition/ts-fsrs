import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  learningStepFieldsSchema,
  learningStepsConfigSchema,
} from './schema.js'
import type { LearningStepsMiddlewareConfig, StepUnit } from './types.js'

describe('learningStepsConfigSchema', () => {
  it('accepts learning and relearning step units', () => {
    const config = learningStepsConfigSchema.parse({
      enableShortTerm: true,
      learningSteps: ['1m', '1.5h', '0.25d'],
      relearningSteps: ['.5m', '1e2m'],
    })

    expect(config).toEqual({
      enableShortTerm: true,
      learningSteps: ['1m', '1.5h', '0.25d'],
      relearningSteps: ['.5m', '1e2m'],
    })
    expectTypeOf(config).toExtend<LearningStepsMiddlewareConfig>()
    expectTypeOf<StepUnit>().toExtend<`${number}${'m' | 'h' | 'd'}`>()
  })

  it('accepts empty step lists', () => {
    expect(
      learningStepsConfigSchema.parse({
        enableShortTerm: false,
        learningSteps: [],
        relearningSteps: [],
      })
    ).toEqual({
      enableShortTerm: false,
      learningSteps: [],
      relearningSteps: [],
    })
  })

  it('rejects non-object config', () => {
    expect(() => learningStepsConfigSchema.parse(null)).toThrow(
      'Expected learning steps config object'
    )
  })

  it('rejects a missing or invalid enableShortTerm flag', () => {
    for (const enableShortTerm of [undefined, 'true']) {
      expect(() =>
        learningStepsConfigSchema.parse({
          enableShortTerm,
          learningSteps: [],
          relearningSteps: [],
        })
      ).toThrow('Expected enableShortTerm boolean')
    }
  })

  it('rejects invalid learning step lists', () => {
    for (const learningSteps of ['1m', [1], ['1x'], ['1e999m']]) {
      expect(() =>
        learningStepsConfigSchema.parse({
          enableShortTerm: true,
          learningSteps,
          relearningSteps: [],
        })
      ).toThrow('Expected valid learningSteps array')
    }
  })

  it('rejects invalid relearning step lists', () => {
    for (const relearningSteps of ['1m', ['-1m']]) {
      expect(() =>
        learningStepsConfigSchema.parse({
          enableShortTerm: true,
          learningSteps: [],
          relearningSteps,
        })
      ).toThrow('Expected valid relearningSteps array')
    }
  })
})

describe('learningStepFieldsSchema', () => {
  it('defaults a missing learningStep to zero', () => {
    expect(learningStepFieldsSchema.parse({})).toEqual({ learningStep: 0 })
  })

  it('accepts a non-negative integer learningStep', () => {
    expect(learningStepFieldsSchema.parse({ learningStep: 0 })).toEqual({
      learningStep: 0,
    })
    expect(learningStepFieldsSchema.parse({ learningStep: 2 })).toEqual({
      learningStep: 2,
    })
  })

  it('rejects non-object fields', () => {
    expect(() => learningStepFieldsSchema.parse(null)).toThrow(
      'Expected learning step fields object'
    )
  })

  it('rejects invalid learningStep values', () => {
    for (const learningStep of ['0', Number.NaN, 0.5, -1]) {
      expect(() => learningStepFieldsSchema.parse({ learningStep })).toThrow(
        'Expected non-negative integer learningStep'
      )
    }
  })
})
