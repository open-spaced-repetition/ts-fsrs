import type { StandardSchemaV1 } from '@standard-schema/spec'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { z } from 'zod/mini'
import { FSRSValidationError } from '../../error.js'
import { FSRS6_DEFAULT_WEIGHTS } from '../../models/fsrs-6/constants.js'
import { FSRS6Model } from '../../models/fsrs-6/model.js'
import type { FSRSState } from '../../models.js'
import { buildSchedulerConfig } from './scheduler-config.js'
import type {
  Card,
  Revlog,
  RevlogStats,
  RollbackContext,
  SchedulerContext,
  SchedulerInput,
  SchedulerInterval,
  SchedulerRollbackInput,
} from './scheduler-context.js'
import {
  defineSchedulerMiddleware,
  type SchedulerMiddleware,
} from './scheduler-middleware.js'

describe('kit/scheduler-config buildSchedulerConfig', () => {
  const model = FSRS6Model({ weights: FSRS6_DEFAULT_WEIGHTS })

  it('merges the model config (no base scheduler)', () => {
    const config = buildSchedulerConfig(model)
    // Type-level: with no middleware the merged config is EXACTLY the model's
    // output — no core, no loose index signature.
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
    const mw2 = defineSchedulerMiddleware(model, {
      configSchema: z.object({ foo2: z._default(z.string(), '5') }),
      fieldSchema: z.object({ bar: z.string() }),
      reviewHandler: (ctx, next) => {
        expectTypeOf(ctx.input.card.bar).toEqualTypeOf<string>()
        expectTypeOf(ctx.input.card.difficulty).toEqualTypeOf<number>()

        next()
        if (!ctx.result) {
          return
        }
        expectTypeOf(ctx.result.card.stability).toEqualTypeOf<number>()
        expectTypeOf(ctx.result.card.difficulty).toEqualTypeOf<number>()
      },
      rollbackHandler: (_, next) => {
        next()
      },
    })
    const config = buildSchedulerConfig(model, [mw1, mw2])
    expectTypeOf(config).toEqualTypeOf<{
      weights: number[]
      enableShortTerm: boolean
      numRelearningSteps: number
      foo: number
      foo2: string
    }>()

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
    expect(() => buildSchedulerConfig(model, [mw], { bar: 'string' })).toThrow(
      FSRSValidationError
    )
  })

  it('infers middleware fieldSchema through review and rollback contexts', () => {
    const configSchema = z.object({})
    const fieldSchema = z.object({ bar: z.string() })
    const defaultedFieldSchema = z.object({
      defaulted: z._default(z.string(), 'fallback'),
    })
    type ConfigSchema = typeof configSchema
    type FieldSchema = typeof fieldSchema
    type DefaultedFieldSchema = typeof defaultedFieldSchema
    type MemoryState = { difficulty: number; stability: number }

    defineSchedulerMiddleware<MemoryState, ConfigSchema, FieldSchema>({
      configSchema,
      fieldSchema,
      reviewHandler: (ctx, next) => {
        expectTypeOf(ctx.input.card).toEqualTypeOf<
          Card<MemoryState, { bar: string }>
        >()
        next()
        if (!ctx.result) {
          return
        }
        expectTypeOf(ctx.result.card).toEqualTypeOf<
          Card<MemoryState, { bar: string } & SchedulerInterval>
        >()
        expectTypeOf(ctx.result.log).toEqualTypeOf<
          Revlog<MemoryState, { bar: string } & SchedulerInterval>
        >()
      },
      rollbackHandler: (ctx, next) => {
        expectTypeOf(ctx.input.card).toEqualTypeOf<
          Card<MemoryState, { bar: string } & SchedulerInterval>
        >()
        expectTypeOf(ctx.input.revlog).toEqualTypeOf<
          Revlog<MemoryState, { bar: string } & SchedulerInterval>
        >()
        next()
        if (!ctx.result) {
          return
        }
        expectTypeOf(ctx.result).toEqualTypeOf<
          Card<MemoryState, { bar: string } & SchedulerInterval>
        >()
      },
    })

    type InputWithDuration = SchedulerInput<MemoryState, FieldSchema> & {
      readonly durationMs: number
    }
    type ContextWithDuration = SchedulerContext<
      MemoryState,
      FieldSchema,
      ConfigSchema,
      InputWithDuration
    >
    type RollbackWithDuration = RollbackContext<
      MemoryState,
      FieldSchema,
      ConfigSchema,
      InputWithDuration
    >

    expectTypeOf<RollbackWithDuration['input']>().toEqualTypeOf<
      SchedulerRollbackInput<MemoryState, FieldSchema, InputWithDuration>
    >()
    expectTypeOf<NonNullable<RollbackWithDuration['result']>>().toEqualTypeOf<
      Card<MemoryState, { bar: string } & SchedulerInterval>
    >()
    expectTypeOf<
      NonNullable<ContextWithDuration['result']>['log']['durationMs']
    >().toEqualTypeOf<number>()
    expectTypeOf<
      RollbackWithDuration['input']['revlog']['durationMs']
    >().toEqualTypeOf<number>()
    expectTypeOf<
      RollbackWithDuration['input']['revlog']['reps']
    >().toEqualTypeOf<number>()
    expectTypeOf<
      RollbackWithDuration['input']['revlog']['lapses']
    >().toEqualTypeOf<number>()
    expectTypeOf<
      RollbackWithDuration['input']['revlog']['interval']
    >().toEqualTypeOf<number>()
    expectTypeOf<
      Pick<
        RollbackWithDuration['input']['revlog'],
        'state' | 'rating' | 'reps' | 'lapses'
      >
    >().toEqualTypeOf<RevlogStats>()
    expectTypeOf<
      NonNullable<
        SchedulerContext<MemoryState, FieldSchema>['result']
      >['log']['durationMs']
    >().toEqualTypeOf<number | undefined>()

    expectTypeOf<
      SchedulerInput<MemoryState, DefaultedFieldSchema>['card']
    >().toEqualTypeOf<Card<MemoryState, { defaulted?: string | undefined }>>()
    expectTypeOf<
      NonNullable<RollbackContext<MemoryState, DefaultedFieldSchema>['result']>
    >().toEqualTypeOf<
      Card<MemoryState, { defaulted: string } & SchedulerInterval>
    >()
  })

  it('infers MemoryState from the model-aware middleware helper', () => {
    const fieldSchema = z.object({ bar: z.string() })

    const mw = defineSchedulerMiddleware(model, {
      fieldSchema,
      reviewHandler: (ctx, next) => {
        expectTypeOf(ctx.input.card).toEqualTypeOf<
          Card<FSRSState, { bar: string }>
        >()
        next()
        if (!ctx.result) {
          return
        }
        expectTypeOf(ctx.result.card).toEqualTypeOf<
          Card<FSRSState, { bar: string } & SchedulerInterval>
        >()
      },
      rollbackHandler: (ctx, next) => {
        expectTypeOf(ctx.input.card).toEqualTypeOf<
          Card<FSRSState, { bar: string } & SchedulerInterval>
        >()
        next()
        if (!ctx.result) {
          return
        }
        expectTypeOf(ctx.result).toEqualTypeOf<
          Card<FSRSState, { bar: string } & SchedulerInterval>
        >()
      },
    })

    expectTypeOf(mw).toEqualTypeOf<
      SchedulerMiddleware<FSRSState, StandardSchemaV1, typeof fieldSchema>
    >()
  })
})
