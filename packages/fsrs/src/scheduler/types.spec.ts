import { describe, expectTypeOf, it } from 'vitest'
import { z } from 'zod/mini'
import { FSRS6_DEFAULT_WEIGHTS } from '../models/fsrs-6/constants.js'
import { FSRS6Model } from '../models/fsrs-6/model.js'
import { Rating } from '../models.js'
import {
  configureScheduler,
  defineSchedulerMiddleware,
  type MiddlewareSchedulerModel,
  type ReviewResult,
  type SchedulerConfigInput,
  type SchedulerForgetInput,
  type SchedulerForgetResult,
  type SchedulerResetInput,
  type SchedulerResetResult,
  type SchedulerReviewInput,
} from './index.js'

describe('scheduler public types', () => {
  const configSchema = z.object({
    requiredMiddlewareValue: z.number(),
    defaultedMiddlewareValue: z._default(z.string(), 'fallback'),
  })
  const fieldSchema = z.object({
    sourceId: z.string(),
    state: z.number(),
    defaultedField: z._default(z.string(), 'fallback'),
  })
  const storeSchema = z.object({
    touched: z._default(z.boolean(), false),
  })
  const middleware = defineSchedulerMiddleware({
    configSchema,
    fieldSchema,
    storeSchema,
    review(ctx, next) {
      expectTypeOf(ctx.config.requiredMiddlewareValue).toEqualTypeOf<number>()
      expectTypeOf(ctx.config.defaultedMiddlewareValue).toEqualTypeOf<string>()
      expectTypeOf(ctx.input.card.defaultedField).toEqualTypeOf<string>()
      expectTypeOf(ctx.model).toEqualTypeOf<MiddlewareSchedulerModel>()
      expectTypeOf(ctx.store.get('touched')).toEqualTypeOf<boolean>()
      expectTypeOf(
        ctx.store.get<{ desiredRetention: number }>('desiredRetention')
      ).toEqualTypeOf<number>()
      ctx.store.set('touched', true)
      ctx.store.set<{ desiredRetention: number }>('desiredRetention', 0.9)
      expectTypeOf(ctx.result.card.sourceId).toEqualTypeOf<string>()
      ctx.result.card.sourceId = ctx.input.card.sourceId
      ctx.result.card = {
        difficulty: ctx.result.card.difficulty,
        stability: ctx.result.card.stability,
        interval: ctx.result.card.interval,
        sourceId: ctx.input.card.sourceId,
        state: ctx.input.card.state,
        defaultedField: ctx.input.card.defaultedField,
      }
      expectTypeOf(ctx.result.log.sourceId).toEqualTypeOf<string>()
      ctx.result.log.rating = ctx.input.rating
      ctx.result.log = {
        ...ctx.input.card,
        rating: ctx.input.rating,
      }
      const compileOnly = () => {
        // @ts-expect-error middleware model only exposes scheduler operations.
        void ctx.model.config
      }
      expectTypeOf(compileOnly).returns.toEqualTypeOf<void>()
      const result = next()
      expectTypeOf(result.card.sourceId).toEqualTypeOf<string>()
      return result
    },
    rollback(_ctx, next) {
      return next()
    },
  })

  const createScheduler = configureScheduler({
    model: FSRS6Model,
    middlewares: [middleware],
  })
  const scheduler = createScheduler({
    weights: FSRS6_DEFAULT_WEIGHTS,
    requiredMiddlewareValue: 1,
  })

  it('merges model and middleware config input', () => {
    type Config = Parameters<typeof createScheduler>[0]

    expectTypeOf<Config>().toEqualTypeOf<{
      weights: number[]
      enableShortTerm?: boolean
      numRelearningSteps?: number
      requiredMiddlewareValue: number
      defaultedMiddlewareValue?: string
    }>()
    expectTypeOf<Config>().toEqualTypeOf<
      SchedulerConfigInput<typeof FSRS6Model, readonly [typeof middleware]>
    >()
  })

  it('uses field schema input for review card and output for result card/log', () => {
    type ReviewInput = Parameters<typeof scheduler.review>[0]
    type Result = ReturnType<typeof scheduler.review>

    expectTypeOf<ReviewInput>().toEqualTypeOf<
      SchedulerReviewInput<typeof FSRS6Model, readonly [typeof middleware]>
    >()
    expectTypeOf<ReviewInput['card']>().toEqualTypeOf<{
      difficulty: number
      stability: number
      interval?: number
      sourceId: string
      state: number
      defaultedField?: string
    }>()
    expectTypeOf<Result>().toEqualTypeOf<
      ReviewResult<typeof FSRS6Model, readonly [typeof middleware]>
    >()
    expectTypeOf<Result['card']['defaultedField']>().toEqualTypeOf<string>()
    expectTypeOf<Result['log']['defaultedField']>().toEqualTypeOf<string>()
    expectTypeOf<Result['log']['rating']>().toEqualTypeOf<
      Rating.Again | Rating.Hard | Rating.Good | Rating.Easy
    >()
  })

  it('types preview, rollback, reset, and forget from the configured middleware tuple', () => {
    const preview = scheduler.preview({
      card: {
        difficulty: 5,
        stability: 10,
        sourceId: 'card-1',
        state: 0,
      },
      elapsedDays: 3,
    })
    const reviewed = scheduler.review({
      card: {
        difficulty: 5,
        stability: 10,
        sourceId: 'card-1',
        state: 0,
      },
      rating: Rating.Good,
      elapsedDays: 3,
    })
    const rollback = scheduler.rollback({
      card: reviewed.card,
      revlog: reviewed.log,
    })
    const reset = scheduler.reset({
      card: {
        difficulty: 5,
        stability: 10,
        sourceId: 'card-1',
        state: 0,
      },
    })
    const forgotten = scheduler.forget({
      card: {
        difficulty: 5,
        stability: 10,
        sourceId: 'card-1',
        state: 0,
      },
    })

    expectTypeOf(preview[Rating.Again]).toEqualTypeOf<typeof reviewed>()
    expectTypeOf(rollback).toEqualTypeOf<typeof reviewed.card>()
    expectTypeOf(reset).toEqualTypeOf<typeof reviewed.card>()
    expectTypeOf<Parameters<typeof scheduler.reset>[0]>().toEqualTypeOf<
      SchedulerResetInput<typeof FSRS6Model, readonly [typeof middleware]>
    >()
    expectTypeOf(reset).toEqualTypeOf<
      SchedulerResetResult<typeof FSRS6Model, readonly [typeof middleware]>
    >()
    expectTypeOf(forgotten).toEqualTypeOf<
      SchedulerForgetResult<typeof FSRS6Model, readonly [typeof middleware]>
    >()
    expectTypeOf(forgotten.log.rating).toEqualTypeOf<Rating.Manual>()
    expectTypeOf<Parameters<typeof scheduler.forget>[0]>().toEqualTypeOf<
      SchedulerForgetInput<typeof FSRS6Model, readonly [typeof middleware]>
    >()

    const compileOnly = () => {
      scheduler.rollback({
        card: reviewed.card,
        revlog: reviewed.log,
      })
      // @ts-expect-error forget uses Rating.Manual and cannot be rollback input.
      scheduler.rollback({
        card: forgotten.card,
        revlog: forgotten.log,
      })
    }
    expectTypeOf(compileOnly).returns.toEqualTypeOf<void>()
  })

  it('does not widen cards when a middleware has no field schema', () => {
    const noFieldMiddleware = defineSchedulerMiddleware({
      review(ctx, next) {
        expectTypeOf(ctx.input.card.difficulty).toEqualTypeOf<number>()
        return next()
      },
    })
    const createNoFieldScheduler = configureScheduler({
      model: FSRS6Model,
      middlewares: [noFieldMiddleware],
    })
    const noFieldScheduler = createNoFieldScheduler({
      weights: FSRS6_DEFAULT_WEIGHTS,
    })
    type CardInput = Parameters<typeof noFieldScheduler.review>[0]['card']

    expectTypeOf<CardInput>().toEqualTypeOf<{
      difficulty: number
      stability: number
      interval?: number | undefined
    }>()
  })

  it('rejects Rating.Manual in review input', () => {
    const compileOnly = () =>
      scheduler.review({
        card: {
          difficulty: 5,
          stability: 10,
          sourceId: 'card-1',
          state: 0,
        },
        // biome-ignore lint/suspicious/noExplicitAny:Force incorrect rating for testing
        rating: Rating.Manual as any,
        elapsedDays: 3,
      })

    expectTypeOf(compileOnly).returns.toEqualTypeOf<
      ReturnType<typeof scheduler.review>
    >()
  })
})
