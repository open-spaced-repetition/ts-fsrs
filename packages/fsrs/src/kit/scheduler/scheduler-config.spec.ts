import { describe, expect, expectTypeOf, it } from 'vitest'
import { z } from 'zod/mini'
import { FSRSValidationError } from '../../error.js'
import { FSRS6_DEFAULT_WEIGHTS } from '../../models/fsrs-6/constants.js'
import { FSRS6Model } from '../../models/fsrs-6/model.js'
import { buildSchedulerConfig } from './scheduler-config.js'
import {
  defineSchedulerMiddleware,
  type SchedulerMiddleware,
} from './scheduler-middleware.js'

describe('kit/scheduler-config buildSchedulerConfig', () => {
  const model = FSRS6Model({ weights: FSRS6_DEFAULT_WEIGHTS })

  it('merges the model config (no base scheduler knobs)', () => {
    const config = buildSchedulerConfig(model, [])
    // Type-level: with no middleware the merged config is EXACTLY the model's
    // output — no core knobs, no loose index signature.
    expectTypeOf(config).toEqualTypeOf<{
      weights: number[]
      enableShortTerm: boolean
      numRelearningSteps: number
    }>()

    expect(config.weights).toHaveLength(21)
    expect(config.enableShortTerm).toBe(true)
    expect(config.numRelearningSteps).toBe(0)
  })

  it('merges a middleware configSchema slice (fragment-parse)', () => {
    // `satisfies` (not a `: SchedulerMiddleware` annotation) keeps the concrete
    // configSchema type, so `foo` is inferred onto the merged config — the whole
    // point of deriving SchedulerConfig from the contributors.
    const mw1 = defineSchedulerMiddleware({
      configSchema: z.object({ foo: z._default(z.number(), 5) }),
      reviewHandler: (_, next) => {
        next()
      },
      rollbackHandler: (_, next) => {
        next()
      },
    })
    const mw2 = defineSchedulerMiddleware({
      configSchema: z.object({ foo2: z._default(z.string(), '5') }),
      fieldSchema: z.object({ bar: z.string() }),
      reviewHandler: (ctx, next) => {
        expectTypeOf(ctx.card.bar).toEqualTypeOf<string>()
        next()
      },
      rollbackHandler: (_, next) => {
        next()
      },
    })
    const config = buildSchedulerConfig(model, [mw1, mw2])
    // Type-level: the middleware's configSchema output is merged onto the
    // model's output, so `foo` is part of the inferred config.
    expectTypeOf(config).toEqualTypeOf<{
      weights: number[]
      enableShortTerm: boolean
      numRelearningSteps: number
      foo: number
      foo2: string
    }>()
    expectTypeOf(config.foo).toEqualTypeOf<number>()
    expectTypeOf(config.foo2).toEqualTypeOf<string>()

    expect(config.foo).toBe(5)
    expect(config.foo2).toBe('5')

    const overridden = buildSchedulerConfig(model, [mw1, mw2], { foo: 9 })
    expect(overridden.foo).toBe(9)
  })

  it('throws when the model weights are invalid', () => {
    expect(() =>
      buildSchedulerConfig(model, [], { weights: [1, 2, 3] })
    ).toThrow(FSRSValidationError)
  })

  it('throws when a middleware configSchema rejects the input', () => {
    const mw = {
      configSchema: z.object({ bar: z.number() }),
      reviewHandler: (_, next) => {
        next()
      },
      rollbackHandler: (_, next) => {
        next()
      },
    } satisfies SchedulerMiddleware
    expect(() => buildSchedulerConfig(model, [mw], {})).toThrow(
      FSRSValidationError
    )
  })
})
