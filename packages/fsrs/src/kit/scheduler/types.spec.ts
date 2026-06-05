import type { StandardSchemaV1 } from '@standard-schema/spec'
import { describe, expectTypeOf, it } from 'vitest'
import { z } from 'zod/mini'
import type { FSRS6ConfigSchema } from '../../models/fsrs-6/config.js'
import { FSRS6_DEFAULT_WEIGHTS } from '../../models/fsrs-6/constants.js'
import { FSRS6Model } from '../../models/fsrs-6/model.js'
import type { FSRSState, Grade } from '../../models.js'
import type {
  SchedulerInput,
  SchedulerMiddlewareInput,
  SchedulerMiddlewareResult,
  SchedulerResult,
  SchedulerRollbackInput,
} from './scheduler-context.js'
import { defineSchedulerMiddleware } from './scheduler-middleware.js'
import type { IScheduler, SchedulerOptions } from './types.js'

describe('kit/scheduler types', () => {
  const model = FSRS6Model({ weights: FSRS6_DEFAULT_WEIGHTS })
  const configSchema = z.object({
    requiredMiddlewareValue: z.number(),
    defaultedMiddlewareValue: z._default(z.string(), 'fallback'),
  })
  const fieldSchema = z.object({
    sourceId: z.string(),
    defaultedField: z._default(z.string(), 'fallback'),
  })
  const middleware = defineSchedulerMiddleware(model, {
    configSchema,
    fieldSchema,
    reviewHandler: (_, next) => {
      next()
    },
    rollbackHandler: (_, next) => {
      next()
    },
  })
  const middlewares = [middleware] as const

  type Middlewares = typeof middlewares
  type MemoryState = FSRSState

  it('types SchedulerOptions config as input values', () => {
    type Options = SchedulerOptions<typeof FSRS6ConfigSchema, Middlewares>

    const options = {
      Model: FSRS6Model,
      middlewares,
      config: {
        weights: FSRS6_DEFAULT_WEIGHTS,
        requiredMiddlewareValue: 1,
      },
    } satisfies Options

    expectTypeOf<typeof options.Model>().toExtend<Options['Model']>()
    expectTypeOf(options.middlewares).toEqualTypeOf<Middlewares>()
    expectTypeOf(options.config).toEqualTypeOf<{
      weights: number[]
      requiredMiddlewareValue: number
    }>()
    expectTypeOf<Options['config']>().toEqualTypeOf<{
      weights: number[]
      enableShortTerm?: boolean | undefined
      numRelearningSteps?: number | undefined
      requiredMiddlewareValue: number
      defaultedMiddlewareValue?: string | undefined
    }>()
  })

  it('types IScheduler review from scheduler middleware context types', () => {
    type Scheduler = IScheduler<MemoryState, Middlewares>
    type reviewInput = Parameters<Scheduler['review']>[0]
    type reviewResult = ReturnType<Scheduler['review']>
    type durationReviewInput = reviewInput & {
      readonly durationMs: number
    }
    const reviewWithDuration = (
      scheduler: Scheduler,
      input: durationReviewInput
    ) => scheduler.review(input)
    type durationReviewResult = ReturnType<typeof reviewWithDuration>

    expectTypeOf<reviewInput>().toEqualTypeOf<
      SchedulerMiddlewareInput<MemoryState, Middlewares>
    >()
    expectTypeOf<reviewResult>().toEqualTypeOf<
      SchedulerMiddlewareResult<
        MemoryState,
        Middlewares,
        SchedulerMiddlewareInput<MemoryState, Middlewares>
      >
    >()
    expectTypeOf<reviewResult['log']['durationMs']>().toEqualTypeOf<
      number | undefined
    >()
    expectTypeOf<durationReviewResult>().toEqualTypeOf<
      SchedulerMiddlewareResult<MemoryState, Middlewares, durationReviewInput>
    >()
    expectTypeOf<
      durationReviewResult['log']['durationMs']
    >().toEqualTypeOf<number>()
  })

  it('types IScheduler rollback from scheduler rollback context types', () => {
    type Scheduler = IScheduler<MemoryState, Middlewares>
    type rollbackInput = Parameters<Scheduler['rollback']>[0]
    type rollbackResult = ReturnType<Scheduler['rollback']>
    type reviewInput = SchedulerInput<MemoryState>

    expectTypeOf<rollbackInput>().toEqualTypeOf<
      SchedulerRollbackInput<MemoryState, StandardSchemaV1, reviewInput>
    >()
    expectTypeOf<rollbackResult>().toEqualTypeOf<
      SchedulerResult<MemoryState, StandardSchemaV1, reviewInput>['card']
    >()
  })

  it('types IScheduler preview without rating and returns one result per grade', () => {
    type Scheduler = IScheduler<MemoryState, Middlewares>
    type previewInput = Parameters<Scheduler['preview']>[0]
    type previewResult = ReturnType<Scheduler['preview']>
    type expectedPreviewInput = Omit<
      SchedulerMiddlewareInput<MemoryState, Middlewares>,
      'rating'
    >
    type expectedPreviewResult = Record<
      Grade,
      SchedulerMiddlewareResult<
        MemoryState,
        Middlewares,
        expectedPreviewInput &
          Pick<SchedulerMiddlewareInput<MemoryState, Middlewares>, 'rating'>
      >
    >

    expectTypeOf<previewInput>().toEqualTypeOf<expectedPreviewInput>()
    expectTypeOf<previewResult>().toEqualTypeOf<expectedPreviewResult>()
  })
})
