import type { StandardSchemaV1 } from '@standard-schema/spec'
import { describe, expect, it } from 'vitest'
import { z } from 'zod/mini'
import { FSRSValidationError } from '../error.js'
import { Rating, State } from '../models.js'
import {
  configureScheduler,
  defineSchedulerMiddleware,
  desiredRetentionMiddleware,
  FSRSMemoryStateSchema,
  fuzzMiddleware,
  intervalMiddleware,
  learningStepMiddleware,
  monotonicIntervalMiddleware,
  type SchedulerModelDefinition,
  statsMiddleware,
} from './index.js'

const modelConfigSchema = z.object({
  modelScale: z._default(z.number(), 1),
})

const modelBounds = {
  sMin: 0,
  sMax: 100,
  dMin: 0,
  dMax: 10,
} as const

export const defaultSchedulerMiddlewares = [
  statsMiddleware,
  desiredRetentionMiddleware,
  learningStepMiddleware,
  monotonicIntervalMiddleware,
  intervalMiddleware,
] as const

function createMockModelFactory() {
  let stepCalls = 0
  const factory = {
    configSchema: modelConfigSchema,
    memoryStateSchema: FSRSMemoryStateSchema,
    create(config) {
      const modelConfig = Object.freeze(z.parse(modelConfigSchema, config))
      return {
        config: modelConfig,
        bounds: modelBounds,
        step({ memoryState, rating, elapsedDays }) {
          stepCalls += 1
          const previous = memoryState ?? {
            difficulty: 0,
            stability: 0,
          }
          return {
            difficulty: previous.difficulty + rating / 10,
            stability: previous.stability + elapsedDays + rating,
          }
        },
        nextInterval(memoryState, desiredRetention) {
          return Math.max(
            1,
            Math.round(
              memoryState.stability * desiredRetention * modelConfig.modelScale
            )
          )
        },
        forgettingCurve(memoryState, elapsedDays) {
          return memoryState.stability / (memoryState.stability + elapsedDays)
        },
        forward({ history, initialState }) {
          const previous = initialState ?? {
            difficulty: 0,
            stability: 0,
          }
          return history.map((review) => ({
            difficulty: previous.difficulty + review.rating / 10,
            stability: previous.stability + review.deltaT + review.rating,
          }))
        },
      }
    },
  } satisfies SchedulerModelDefinition<typeof modelConfigSchema>

  return {
    factory,
    getStepCalls: () => stepCalls,
  }
}

describe('scheduler runtime', () => {
  it('parses config fragments, fills defaults, reviews, previews, and rolls back', () => {
    const { factory, getStepCalls } = createMockModelFactory()
    const scheduler = configureScheduler({
      model: factory,
      middlewares: [
        desiredRetentionMiddleware,
        monotonicIntervalMiddleware,
        intervalMiddleware,
      ],
    })({
      modelScale: 2,
    })

    const result = scheduler.review({
      card: {
        difficulty: 1,
        stability: 10,
      },
      rating: Rating.Good,
      elapsedDays: 3,
    })

    expect(result.memoryState).toEqual({
      difficulty: 1.3,
      stability: 16,
    })
    expect(result.card.interval).toBe(29)
    expect(result.log).toEqual({
      difficulty: 1,
      stability: 10,
      interval: 0,
      rating: Rating.Good,
    })
    expect(
      scheduler.rollback({ card: result.card, revlog: result.log })
    ).toEqual({
      difficulty: 1,
      stability: 10,
      interval: 0,
    })

    const preview = scheduler.preview({
      card: result.card,
      elapsedDays: 1,
    })
    expect(Object.keys(preview).map(Number).sort()).toEqual([
      Rating.Again,
      Rating.Hard,
      Rating.Good,
      Rating.Easy,
    ])
    expect(preview[Rating.Again].memoryState).not.toEqual(
      preview[Rating.Easy].memoryState
    )
    expect(getStepCalls()).toBe(7)
  })

  it('computes only required interval candidates for a review rating', () => {
    const { factory, getStepCalls } = createMockModelFactory()
    const scheduler = configureScheduler({
      model: factory,
      middlewares: [
        desiredRetentionMiddleware,
        monotonicIntervalMiddleware,
        intervalMiddleware,
      ],
    })({})

    scheduler.review({
      card: {
        difficulty: 1,
        stability: 10,
      },
      rating: Rating.Hard,
      elapsedDays: 3,
    })

    expect(getStepCalls()).toBe(2)
  })

  it('preserves middleware onion order', () => {
    const { factory } = createMockModelFactory()
    const order: string[] = []
    const outer = defineSchedulerMiddleware({
      review(_ctx, next) {
        order.push('outer.in')
        const result = next()
        order.push('outer.out')
        return result
      },
    })
    const inner = defineSchedulerMiddleware({
      review(_ctx, next) {
        order.push('inner.in')
        const result = next()
        order.push('inner.out')
        return result
      },
    })

    configureScheduler({
      model: factory,
      middlewares: [outer, inner],
    })({}).review({
      card: {
        difficulty: 1,
        stability: 2,
      },
      rating: Rating.Good,
      elapsedDays: 1,
    })

    expect(order).toEqual(['outer.in', 'inner.in', 'inner.out', 'outer.out'])
  })

  it('allows middleware to write ctx.result before next()', () => {
    const { factory } = createMockModelFactory()
    const order: string[] = []
    const outer = defineSchedulerMiddleware({
      review(ctx, next) {
        ctx.result.card = {
          ...ctx.result.card,
          interval: 41,
        }
        order.push(`outer.before:${ctx.result.card.interval}`)
        const result = next()
        order.push(`outer.after:${result.card.interval}`)
        return result
      },
    })
    const inner = defineSchedulerMiddleware({
      review(ctx, next) {
        order.push(`inner.before:${ctx.result.card.interval}`)
        ctx.result.card.interval += 1
        return next()
      },
    })

    const result = configureScheduler({
      model: factory,
      middlewares: [outer, inner],
    })({}).review({
      card: {
        difficulty: 1,
        stability: 2,
      },
      rating: Rating.Good,
      elapsedDays: 1,
    })

    expect(order).toEqual([
      'outer.before:41',
      'inner.before:41',
      'outer.after:42',
    ])
    expect(result.card.interval).toBe(42)
    expect(result.card.difficulty).toBe(1.3)
    expect(result.card.stability).toBe(6)
  })

  it('does not step the model before a middleware calls next()', () => {
    const { factory, getStepCalls } = createMockModelFactory()
    const shortCircuit = defineSchedulerMiddleware({
      review(ctx) {
        const memoryState = {
          difficulty: 9,
          stability: 99,
        }
        ctx.result.card = {
          ...ctx.result.card,
          ...memoryState,
          interval: 7,
        }

        return {
          memoryState,
          card: ctx.result.card,
          log: {
            ...ctx.input.card,
            rating: ctx.input.rating,
          },
        }
      },
    })

    const result = configureScheduler({
      model: factory,
      middlewares: [shortCircuit],
    })({}).review({
      card: {
        difficulty: 1,
        stability: 2,
      },
      rating: Rating.Good,
      elapsedDays: 1,
    })

    expect(getStepCalls()).toBe(0)
    expect(result.card).toEqual({
      difficulty: 9,
      stability: 99,
      interval: 7,
    })
  })

  it('captures middleware handlers when scheduler is configured', () => {
    const { factory } = createMockModelFactory()
    const calls: string[] = []
    const middleware = defineSchedulerMiddleware({
      review(_ctx, next) {
        calls.push('captured')
        return next()
      },
    })
    const createScheduler = configureScheduler({
      model: factory,
      middlewares: [middleware],
    })

    Object.defineProperty(middleware, 'review', {
      value(
        _ctx: Parameters<NonNullable<typeof middleware.review>>[0],
        next: Parameters<NonNullable<typeof middleware.review>>[1]
      ) {
        calls.push('mutated')
        return next()
      },
    })

    createScheduler({}).review({
      card: {
        difficulty: 1,
        stability: 2,
      },
      rating: Rating.Good,
      elapsedDays: 1,
    })

    expect(calls).toEqual(['captured'])
  })

  it('throws on config validation failure and async schema', () => {
    const { factory } = createMockModelFactory()
    const requiredMiddleware = defineSchedulerMiddleware({
      configSchema: z.object({
        requiredValue: z.number(),
      }),
    })
    const createScheduler = configureScheduler({
      model: factory,
      middlewares: [requiredMiddleware],
    })

    expect(() =>
      createScheduler({} as Parameters<typeof createScheduler>[0])
    ).toThrow(FSRSValidationError)

    const asyncConfigSchema = {
      '~standard': {
        version: 1,
        vendor: 'test',
        types: undefined as
          | StandardSchemaV1.Types<
              { asyncValue?: number },
              { asyncValue: number }
            >
          | undefined,
        validate: async () => ({
          value: {
            asyncValue: 1,
          },
        }),
      },
    } satisfies StandardSchemaV1<
      { asyncValue?: number },
      { asyncValue: number }
    >
    const asyncMiddleware = defineSchedulerMiddleware({
      configSchema: asyncConfigSchema,
    })
    const createAsyncScheduler = configureScheduler({
      model: factory,
      middlewares: [asyncMiddleware],
    })

    expect(() =>
      createAsyncScheduler({
        asyncValue: 1,
      })
    ).toThrow(/async schema is not supported/)
  })

  it('applies stats middleware and rollback restores the normalized previous card', () => {
    const { factory } = createMockModelFactory()
    const scheduler = configureScheduler({
      model: factory,
      middlewares: [
        statsMiddleware,
        desiredRetentionMiddleware,
        intervalMiddleware,
      ],
    })({})

    const result = scheduler.review({
      card: {
        difficulty: 1,
        stability: 2,
        state: 0,
        reps: 0,
        lapses: 0,
      },
      rating: Rating.Good,
      elapsedDays: 1,
    })

    expect(result.card.reps).toBe(1)
    expect(result.card.state).toBe(State.Review)
    expect(result.log.reps).toBe(0)
    expect(result.log.state).toBe(State.New)
    expect(
      scheduler.rollback({ card: result.card, revlog: result.log })
    ).toEqual({
      difficulty: 1,
      stability: 2,
      interval: 0,
      reps: 0,
      lapses: 0,
      state: State.New,
    })
  })

  it('resets card fields from declared fieldDefaults without middleware handlers', () => {
    const { factory } = createMockModelFactory()
    const fieldSchema = z.object({
      sourceId: z.string(),
      label: z.string(),
      defaultedLabel: z._default(z.string(), 'default-label'),
      defaultedCount: z._default(z.number(), 0),
    })
    const middleware = defineSchedulerMiddleware({
      fieldSchema,
      fieldDefaults: {
        defaultedLabel: 'default-label',
        defaultedCount: 0,
      },
      rollback() {
        throw new Error('reset should not use rollback middleware')
      },
    })
    const scheduler = configureScheduler({
      model: factory,
      middlewares: [middleware],
    })({})

    const reset = scheduler.reset({
      card: {
        difficulty: 5,
        stability: 10,
        interval: 30,
        sourceId: 'card-1',
        label: 'preserved',
        defaultedLabel: 'changed',
        defaultedCount: 99,
      },
    })

    expect(reset).toEqual({
      difficulty: 5,
      stability: 10,
      interval: 0,
      sourceId: 'card-1',
      label: 'preserved',
      defaultedLabel: 'default-label',
      defaultedCount: 0,
    })
  })

  it('resets declared fieldDefaults without running model step or middleware handlers', () => {
    const { factory, getStepCalls } = createMockModelFactory()
    const fieldSchema = z.object({
      sourceId: z.string(),
      counter: z._default(z.number(), 0),
    })
    const middleware = defineSchedulerMiddleware({
      fieldSchema,
      fieldDefaults: {
        counter: 0,
      },
      review() {
        throw new Error('reset should not use review middleware')
      },
      rollback() {
        throw new Error('reset should not use rollback middleware')
      },
    })
    const scheduler = configureScheduler({
      model: factory,
      middlewares: [middleware],
    })({})

    const reset = scheduler.reset({
      card: {
        difficulty: 3,
        stability: 7,
        interval: 12,
        sourceId: 'abc',
        counter: 5,
      },
    })

    expect(reset).toEqual({
      difficulty: 3,
      stability: 7,
      interval: 0,
      sourceId: 'abc',
      counter: 0,
    })
    expect(getStepCalls()).toBe(0)
  })

  it('resets fields from a config-derived fieldDefaults factory', () => {
    const { factory } = createMockModelFactory()
    const configSchema = z.object({
      defaultPriority: z._default(z.number(), 0),
    })
    const fieldSchema = z.object({
      priority: z._default(z.number(), 0),
    })
    const middleware = defineSchedulerMiddleware({
      configSchema,
      fieldSchema,
      fieldDefaults: (config) => ({
        priority: config.defaultPriority,
      }),
    })
    const scheduler = configureScheduler({
      model: factory,
      middlewares: [middleware],
    })({ defaultPriority: 7 })

    const reset = scheduler.reset({
      card: {
        difficulty: 1,
        stability: 2,
        interval: 30,
        priority: 99,
      },
    })

    expect(reset).toEqual({
      difficulty: 1,
      stability: 2,
      interval: 0,
      priority: 7,
    })
  })

  it('resets built-in scheduler fields from their declared field defaults', () => {
    const { factory } = createMockModelFactory()
    const scheduler = configureScheduler({
      model: factory,
      middlewares: [statsMiddleware, learningStepMiddleware],
    })({})

    const reset = scheduler.reset({
      card: {
        difficulty: 5,
        stability: 10,
        interval: 30,
        reps: 8,
        lapses: 2,
        state: State.Review,
        steps: 3,
      },
    })

    expect(reset).toEqual({
      difficulty: 5,
      stability: 10,
      interval: 0,
      reps: 0,
      lapses: 0,
      state: State.New,
      steps: 0,
    })
  })

  it('converts learning steps to day-level intervals', () => {
    const { factory } = createMockModelFactory()
    const scheduler = configureScheduler({
      model: factory,
      middlewares: [
        learningStepMiddleware,
        statsMiddleware,
        desiredRetentionMiddleware,
        intervalMiddleware,
      ],
    })({
      learningSteps: ['1m', '10m'],
      relearningSteps: ['10m'],
    })

    const result = scheduler.review({
      card: {
        difficulty: 0,
        stability: 0,
        state: State.New,
        reps: 0,
        lapses: 0,
      },
      rating: Rating.Good,
      elapsedDays: 0,
    })

    expect(result.card.steps).toBe(1)
    expect(result.card.state).toBe(State.Learning)
    expect(result.card.interval).toBe(600 / 86400)
  })

  it('enforces monotonic intervals over all rating candidates', () => {
    const nonMonotonicFactory = createNonMonotonicModelFactory()
    const scheduler = configureScheduler({
      model: nonMonotonicFactory,
      middlewares: [monotonicIntervalMiddleware, intervalMiddleware],
    })({
      maximumInterval: 100,
    })

    const preview = scheduler.preview({
      card: {
        difficulty: 1,
        stability: 1,
      },
      elapsedDays: 1,
    })

    expect(preview[Rating.Again].card.interval).toBe(10)
    expect(preview[Rating.Hard].card.interval).toBe(11)
    expect(preview[Rating.Good].card.interval).toBe(12)
    expect(preview[Rating.Easy].card.interval).toBe(13)
  })

  it('applies deterministic fuzzing when cardId is supplied', () => {
    const { factory } = createMockModelFactory()
    const scheduler = configureScheduler({
      model: factory,
      middlewares: [fuzzMiddleware, intervalMiddleware],
    })({
      enableFuzz: true,
      maximumInterval: 36500,
    })
    const input = {
      card: {
        difficulty: 3,
        stability: 50,
        cardId: 'card-1',
        reps: 0,
      },
      rating: Rating.Easy,
      elapsedDays: 10,
    } as const

    const first = scheduler.review(input)
    const second = scheduler.review(input)

    expect(first.card.interval).toBe(second.card.interval)
  })

  it('provides a default middleware tuple without requiring fuzz cardId', () => {
    const { factory } = createMockModelFactory()
    const scheduler = configureScheduler({
      model: factory,
      middlewares: defaultSchedulerMiddlewares,
    })({})

    const result = scheduler.review({
      card: {
        difficulty: 1,
        stability: 2,
        state: State.New,
        reps: 0,
        lapses: 0,
      },
      rating: Rating.Good,
      elapsedDays: 0,
    })

    expect(result.card.interval).toBeGreaterThan(0)
  })
})

function createNonMonotonicModelFactory() {
  return {
    configSchema: modelConfigSchema,
    memoryStateSchema: FSRSMemoryStateSchema,
    create(config) {
      const modelConfig = Object.freeze(z.parse(modelConfigSchema, config))
      return {
        config: modelConfig,
        bounds: modelBounds,
        step({ rating }) {
          return {
            difficulty: rating,
            stability: rating,
          }
        },
        nextInterval(memoryState) {
          return 11 - memoryState.difficulty
        },
        forgettingCurve() {
          return 1
        },
        forward({ history }) {
          return history.map((review) => ({
            difficulty: review.rating,
            stability: review.deltaT,
          }))
        },
      }
    },
  } satisfies SchedulerModelDefinition<typeof modelConfigSchema>
}
