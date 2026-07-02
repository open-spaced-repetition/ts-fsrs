import { describe, expect, it, vi } from 'vitest'
import { defineChrono } from '@/chrono/define-chrono.js'
import { dateChrono } from '@/chrono/presets/date/chrono.js'
import { numericChrono } from '@/chrono/presets/numeric/index.js'
import type { Middleware } from '@/middleware/index.js'
import { schedulerStatsMiddleware } from '@/middleware/stats.js'
import { defineModel } from '@/model/model.js'
import { SM2_DEFAULT_WEIGHTS, SM2Model } from '@/model/sm2.test.js'
import { Rating, State } from '@/primitives/index.js'
import { defineSchema, isObject, numberSchema } from '@/schema/index.js'
import { defineScheduler } from './define-scheduler.js'
import { SRSSchedulerError } from './error.js'
import {
  config,
  createSM2NumericScheduler,
  defineStringFieldConfigSchema,
  sourceCardSchema,
  sourceConfigSchema,
  sourceMiddleware,
} from './scheduler.test.js'

const scheduler = createSM2NumericScheduler().use(schedulerStatsMiddleware)
const core = scheduler.create({ config })

const cachedMiddlewareName = 'cachedMiddleware'
const badMiddlewareName = Symbol('badMiddleware')
const retentionMiddlewareName = Symbol('retentionMiddleware')

const middlewareScheduler = createSM2NumericScheduler().use(
  sourceMiddleware,
  schedulerStatsMiddleware
)

const middlewareCore = middlewareScheduler.create({
  config: {
    ...config,
    source: 'test-source',
  },
})

const usedScheduler = createSM2NumericScheduler().use(
  sourceMiddleware,
  schedulerStatsMiddleware
)
const usedCore = usedScheduler.create({
  config: {
    ...config,
    source: 'used-source',
  },
})

describe('SchedulerCore.create', () => {
  it('validates config and returns core', () => {
    expect(core.config).toEqual({ ...config, chrono: {} })
  })

  it('does not expose desiredRetention on config', () => {
    const c = scheduler.create({
      config: { weights: SM2_DEFAULT_WEIGHTS },
    })

    expect(c.config).toEqual({
      weights: SM2_DEFAULT_WEIGHTS,
      chrono: {},
    })
    expect(c.config).not.toHaveProperty('desiredRetention')
  })

  it('rejects invalid config', () => {
    expect(() =>
      scheduler.create({ config: { weights: [1] } as never })
    ).toThrow()
  })

  it('does not copy inherited middleware config fields', () => {
    const inheritedConfigSchema = defineSchema<
      { readonly own: string },
      { readonly own: string }
    >((value) => {
      if (!isObject(value) || typeof value.own !== 'string') {
        return { issues: [{ message: 'Expected own config' }] }
      }

      const prototype = { inherited: 'prototype-value' }
      const config = Object.create(prototype) as { own: string }
      config.own = value.own

      return { value: config }
    })
    const inheritedMiddleware = {
      name: 'inheritedConfig',
      schema: { config: inheritedConfigSchema },
    } satisfies Middleware<
      { readonly config: typeof inheritedConfigSchema },
      'inheritedConfig'
    >
    const inheritedCore = createSM2NumericScheduler()
      .use(inheritedMiddleware)
      .create({
        config: {
          weights: SM2_DEFAULT_WEIGHTS,
          own: 'own-value',
        },
      })

    expect(inheritedCore.config).toHaveProperty('own', 'own-value')
    expect(inheritedCore.config).not.toHaveProperty('inherited')
  })
})

describe('SchedulerCore.newCard', () => {
  it('creates a new card with model defaults', () => {
    const card = core.newCard()
    expect(card.state).toBe(State.New)
    expect(card.interval).toBe(0)
    expect(card.easeFactor).toBe(SM2_DEFAULT_WEIGHTS[2])
    expect(card.reps).toBe(0)
    expect(card.scheduleStatus).toBe('new')
    expect(card.scheduledDays).toBe(0)
    expect(card.elapsedDays).toBe(0)
    expect(card.lapses).toBe(0)
  })

  it('returns a mutable card', () => {
    const card = core.newCard()
    expect(Object.isFrozen(card)).toBe(false)
  })

  it('creates a fresh config-only card each time', () => {
    const freshCore = scheduler.create({ config })
    const firstCard = freshCore.newCard()
    const secondCard = freshCore.newCard()

    expect(secondCard).not.toBe(firstCard)
    expect(secondCard).toStrictEqual(firstCard)
  })

  it('rejects middleware added after create()', () => {
    const dynamicScheduler = createSM2NumericScheduler()
    const dynamicCore = dynamicScheduler.create({ config })

    expect(dynamicCore.newCard()).toHaveProperty('state', State.New)

    expect(() => dynamicScheduler.use(schedulerStatsMiddleware)).toThrow(
      SRSSchedulerError
    )
    expect(() => dynamicScheduler.use(schedulerStatsMiddleware)).toThrow(
      /Cannot add middleware after scheduler\.create\(\)/
    )

    expect(dynamicCore.newCard()).toHaveProperty('state', State.New)
  })

  it('creates distinct cards for different now input', () => {
    const dateScheduler = defineScheduler({
      model: SM2Model,
      chrono: dateChrono,
    })
    const dateCore = dateScheduler.create({ config })
    const first = new Date('2026-01-01T00:00:00.000Z')
    const second = new Date('2026-01-02T00:00:00.000Z')

    const firstCard = dateCore.newCard({ now: first })
    const secondCard = dateCore.newCard({ now: second })

    expect(secondCard).not.toBe(firstCard)
    expect(secondCard.dueAt).toBe(second)
  })

  it('validates now input', () => {
    expect(() => core.newCard({ now: 'bad' as never })).toThrow(
      'Expected finite number'
    )
  })

  it('applies middleware card defaults', () => {
    const card = middlewareCore.newCard()

    expect(card.source).toBe('test-source')
  })

  it('applies middleware added through use()', () => {
    const card = usedCore.newCard()

    expect(card.source).toBe('used-source')
  })

  it('calls config-only middleware card defaults for each new card', () => {
    const cachedMiddleware = {
      name: cachedMiddlewareName,
      schema: {
        config: sourceConfigSchema,
        card: sourceCardSchema,
      },
      defaultValue: {
        card: vi.fn((ctx) => ({
          source: ctx.config.source,
        })),
      },
    } satisfies Middleware<
      {
        readonly config: typeof sourceConfigSchema
        readonly card: typeof sourceCardSchema
      },
      typeof cachedMiddlewareName
    >
    const cachedMiddlewareScheduler = createSM2NumericScheduler().use(
      cachedMiddleware,
      schedulerStatsMiddleware
    )
    const cachedMiddlewareCore = cachedMiddlewareScheduler.create({
      config: {
        ...config,
        source: 'cached-source',
      },
    })

    const firstCard = cachedMiddlewareCore.newCard()
    const secondCard = cachedMiddlewareCore.newCard()

    expect(secondCard).not.toBe(firstCard)
    expect(secondCard).toStrictEqual(firstCard)
    expect(cachedMiddleware.defaultValue.card).toHaveBeenCalledTimes(2)
  })

  it('lets middleware read config fields from the top-level config', () => {
    const trace: string[] = []
    const firstName = 'first'
    const secondName = 'second'
    const firstConfigSchema = defineStringFieldConfigSchema('firstSource')
    const secondConfigSchema = defineStringFieldConfigSchema('secondSource')
    const firstMiddleware: Middleware<
      {
        readonly config: typeof firstConfigSchema
        readonly card: typeof sourceCardSchema
      },
      typeof firstName
    > = {
      name: firstName,
      schema: { config: firstConfigSchema, card: sourceCardSchema },
      defaultValue: {
        card(ctx) {
          trace.push(`first:${ctx.config.firstSource}`)
          return { source: 'first' }
        },
      },
    }
    const secondMiddleware: Middleware<
      {
        readonly config: typeof secondConfigSchema
        readonly card: typeof sourceCardSchema
      },
      typeof secondName
    > = {
      name: secondName,
      schema: { config: secondConfigSchema, card: sourceCardSchema },
      defaultValue: {
        card(ctx) {
          trace.push(`second:${ctx.config.secondSource}`)
          return { source: 'second' }
        },
      },
    }
    const namedScheduler = createSM2NumericScheduler().use(
      secondMiddleware,
      firstMiddleware,
      schedulerStatsMiddleware
    )

    namedScheduler
      .create({
        config: {
          ...config,
          firstSource: 'first-config',
          secondSource: 'second-config',
        },
      })
      .newCard()

    expect(trace).toEqual(['second:second-config', 'first:first-config'])
  })

  it('lets review middleware read and update desiredRetention', () => {
    const seen: number[] = []
    const retentionMiddleware = {
      name: retentionMiddlewareName,
      handlers: {
        review(ctx, next) {
          seen.push(ctx.desiredRetention)
          ctx.desiredRetention = 0.5
          return next()
        },
      },
    } satisfies Middleware<
      Record<PropertyKey, never>,
      typeof retentionMiddlewareName
    >
    const retentionScheduler = createSM2NumericScheduler().use(
      retentionMiddleware,
      schedulerStatsMiddleware
    )
    const retentionCore = retentionScheduler.create({
      config: { weights: SM2_DEFAULT_WEIGHTS },
    })
    const card = retentionCore.newCard({ now: 0 })
    const result = retentionCore.review({
      card,
      grade: Rating.Good,
      now: 0,
    })

    expect(seen).toEqual([0.9])
    expect(result.card.scheduledDays).toBe(7)
  })

  it('lets middleware derive desiredRetention from candidate memory state', () => {
    const seen: unknown[] = []
    const candidateMiddleware = {
      name: Symbol('candidate-retention'),
      handlers: {
        review(ctx, next) {
          const memoryState = ctx.candidate.step(ctx.input.grade)
          seen.push(memoryState)
          ctx.desiredRetention =
            (memoryState.interval as number | undefined) === 1 ? 0.5 : 0.9
          seen.push(
            ctx.candidate.nextInterval(memoryState, ctx.desiredRetention)
          )
          return next()
        },
      },
    } satisfies Middleware
    const candidateCore = createSM2NumericScheduler()
      .use(candidateMiddleware, schedulerStatsMiddleware)
      .create({ config: { weights: SM2_DEFAULT_WEIGHTS } })
    const card = candidateCore.newCard({ now: 0 })
    const result = candidateCore.review({
      card,
      grade: Rating.Good,
      now: 0,
    })

    expect(seen).toEqual([
      {
        interval: 1,
        easeFactor: 2.5,
        reps: 1,
      },
      7,
    ])
    expect(result.card.scheduledDays).toBe(7)
  })

  it('lets middleware read the previous grade candidate separately', () => {
    const seen: unknown[] = []
    const candidateMiddleware = {
      name: Symbol('previous-candidate'),
      handlers: {
        review(ctx, next) {
          const previousMemoryState = ctx.candidate.step(Rating.Hard)
          const hardMemoryState = ctx.candidate.step(Rating.Hard)
          seen.push({
            sameMemoryState: previousMemoryState === hardMemoryState,
            previousScheduledDays: ctx.candidate.nextInterval(
              previousMemoryState,
              ctx.desiredRetention
            ),
            hardScheduledDays: ctx.candidate.nextInterval(
              hardMemoryState,
              ctx.desiredRetention
            ),
          })
          return next()
        },
      },
    } satisfies Middleware
    const candidateCore = createSM2NumericScheduler()
      .use(candidateMiddleware, schedulerStatsMiddleware)
      .create({ config: { weights: SM2_DEFAULT_WEIGHTS } })
    const card = candidateCore.newCard({ now: 0 })

    candidateCore.review({
      card,
      grade: Rating.Good,
      now: 0,
    })

    expect(seen).toEqual([
      {
        sameMemoryState: true,
        previousScheduledDays: 1,
        hardScheduledDays: 1,
      },
    ])
  })

  it('caches nextInterval across cumulative middleware calls in preview', () => {
    type SM2Core = ReturnType<typeof SM2Model.create>
    const nextIntervalSpy = vi.fn<SM2Core['nextInterval']>()

    const SpiedSM2Model = defineModel({
      name: 'sm2-spied',
      schema: SM2Model.schema,
      defaultValue: SM2Model.defaultValue,
      create(ctx) {
        const core = SM2Model.create(ctx)
        nextIntervalSpy.mockImplementation((ms, dr) =>
          core.nextInterval(ms, dr)
        )
        return { ...core, nextInterval: nextIntervalSpy }
      },
    })

    const cumulativeMiddleware = {
      name: Symbol('cumulative-candidate'),
      handlers: {
        review(ctx, next) {
          const currentGrade = ctx.input.grade
          const allGrades = [
            Rating.Again,
            Rating.Hard,
            Rating.Good,
            Rating.Easy,
          ]
          for (const g of allGrades) {
            if (g > currentGrade) break
            const ms = ctx.candidate.step(g)
            ctx.candidate.nextInterval(ms, ctx.desiredRetention)
          }
          return next()
        },
      },
    } satisfies Middleware

    const spiedScheduler = defineScheduler({
      model: SpiedSM2Model,
      chrono: numericChrono,
    }).use(cumulativeMiddleware, schedulerStatsMiddleware)

    const spiedCore = spiedScheduler.create({
      config: { weights: SM2_DEFAULT_WEIGHTS },
    })

    const card = spiedCore.newCard({ now: 0 })

    nextIntervalSpy.mockClear()
    for (const _ of spiedCore.preview({ card, now: 0 })) {
      // consume lazy iterable to trigger all computations
    }

    // Middleware calls: Again=1, Hard=2, Good=3, Easy=4 = 10
    // finalizeReview calls: 4 (one per grade)
    // Total calls: 14, but only 4 unique (memoryState, desiredRetention) pairs
    expect(nextIntervalSpy).toHaveBeenCalledTimes(4)
  })
})

describe('SchedulerCore.review', () => {
  it('transitions New -> Review on Good', () => {
    const card = core.newCard()
    const result = core.review({ card: card, grade: Rating.Good })

    expect(result.card.state).toBe(State.Review)
    expect(result.card.scheduleStatus).toBe('review')
    expect(result.card.interval).toBeGreaterThan(0)
    expect(result.card.reps).toBe(1)
    expect(result.card.lapses).toBe(0)
    expect(result.card.scheduledDays).toBeGreaterThan(0)
  })

  it('transitions New -> Review on Again by default', () => {
    const card = core.newCard()
    const result = core.review({ card: card, grade: Rating.Again })

    expect(result.card.state).toBe(State.Review)
    expect(result.card.reps).toBe(1)
    expect(result.card.lapses).toBe(0)
  })

  it('keeps Review on Again and increments lapses', () => {
    const card = core.newCard()
    const r1 = core.review({ card: card, grade: Rating.Good, now: 0 })
    const r2 = core.review({
      card: r1.card,
      grade: Rating.Again,
      now: r1.card.scheduledDays,
    })

    expect(r2.card.state).toBe(State.Review)
    expect(r2.card.lapses).toBe(1)
  })

  it('returns mutable card and revlog', () => {
    const card = core.newCard()
    const result = core.review({ card: card, grade: Rating.Good })

    expect(Object.isFrozen(result.card)).toBe(false)
    expect(Object.isFrozen(result.revlog)).toBe(false)
  })

  it('records previous state in revlog', () => {
    const card = core.newCard()
    const result = core.review({ card: card, grade: Rating.Good })

    expect(result.revlog.rating).toBe(Rating.Good)
    expect(result.revlog.state).toBe(State.New)
    expect(result.revlog.scheduleStatus).toBe('new')
    expect(result.revlog.interval).toBe(0)
    expect(result.revlog.reps).toBe(0)
    expect(result.revlog.scheduledDays).toBe(0)
  })

  it('records rating and state in core revlog without stats middleware', () => {
    const baseCore = createSM2NumericScheduler().create({ config })
    const card = baseCore.newCard()
    const result = baseCore.review({ card, grade: Rating.Good })

    expect(result.revlog.rating).toBe(Rating.Good)
    expect(result.revlog.state).toBe(State.New)
    expect(result.revlog.scheduledDays).toBe(0)
  })

  it('computes elapsed days from chrono', () => {
    const card = core.newCard()
    const r1 = core.review({ card: card, grade: Rating.Good, now: 0 })
    const r2 = core.review({ card: r1.card, grade: Rating.Good, now: 5 })

    expect(r2.revlog.elapsedDays).toBe(5)
  })

  it('chains multiple reviews correctly', () => {
    const card = core.newCard()
    const r1 = core.review({ card: card, grade: Rating.Good, now: 0 })
    const r2 = core.review({
      card: r1.card,
      grade: Rating.Good,
      now: r1.card.scheduledDays,
    })
    const r3 = core.review({
      card: r2.card,
      grade: Rating.Good,
      now: r1.card.scheduledDays + r2.card.scheduledDays,
    })

    expect(r3.card.reps).toBe(3)
    expect(r3.card.state).toBe(State.Review)
    expect(r3.card.interval).toBeGreaterThan(0)
  })

  it('validates now input', () => {
    const card = core.newCard()
    expect(() =>
      core.review({ card: card, grade: Rating.Good, now: 'bad' as never })
    ).toThrow('Expected finite number')
  })

  it('throws chrono projection errors', () => {
    const failingChrono = defineChrono({
      schema: { time: numberSchema },
      projection() {
        return { issues: [{ message: 'projection failed' }] }
      },
      create() {
        return {
          now: () => 0,
          difference: () => 0,
          add: (from: number) => from,
        }
      },
    })
    const failingScheduler = defineScheduler({
      model: SM2Model,
      chrono: failingChrono,
    })
    const failingCore = failingScheduler.create({ config })
    const card = failingCore.newCard({ now: 0 })

    expect(() =>
      failingCore.review({ card: card, grade: Rating.Good, now: 0 })
    ).toThrow('projection failed')
  })

  it('uses middleware handlers to inject review result fields', () => {
    const card = middlewareCore.newCard({ now: 0 })
    const result = middlewareCore.review({
      card: card,
      grade: Rating.Good,
      now: 0,
    })

    expect(result.card.source).toBe('test-source')
    expect(result.revlog.audit).toBe('test-source')
  })
})

describe('SchedulerCore middleware handlers', () => {
  it('throws when review middleware mutates input fields', () => {
    const card = core.newCard({ now: 0 })

    for (const field of ['card', 'grade', 'now'] as const) {
      const mutatingMiddleware = {
        name: Symbol(`mutate-${field}`),
        handlers: {
          review(ctx, next) {
            ;(ctx.input as Record<typeof field, unknown>)[field] = null
            return next()
          },
        },
      } satisfies Middleware
      const mutatingCore = createSM2NumericScheduler()
        .use(mutatingMiddleware)
        .create({ config })

      expect(() =>
        mutatingCore.review({ card, grade: Rating.Good, now: 0 })
      ).toThrow(`Review input ${field} cannot be changed`)
    }
  })

  it('seeds review result with empty containers', () => {
    const seen: unknown[] = []
    const resultMiddleware = {
      name: Symbol('seed-result'),
      handlers: {
        review(ctx, next) {
          seen.push(structuredClone(ctx.result))
          return next()
        },
      },
    } satisfies Middleware
    const resultCore = createSM2NumericScheduler()
      .use(resultMiddleware, schedulerStatsMiddleware)
      .create({ config })
    const card = resultCore.newCard({ now: 0 })

    resultCore.review({ card, grade: Rating.Good, now: 0 })

    expect(seen).toEqual([
      {
        card: {},
        revlog: {},
      },
    ])
  })

  it('validates the final review result with scheduler schemas', () => {
    const invalidResultMiddleware = {
      name: Symbol('invalid-result'),
      handlers: {
        review(ctx, next) {
          const result = next()
          const runtimeCtx = ctx as {
            readonly result: {
              readonly card: Record<string, unknown>
            }
          }
          delete runtimeCtx.result.card.interval
          return result
        },
      },
    } satisfies Middleware
    const invalidResultCore = createSM2NumericScheduler()
      .use(invalidResultMiddleware, schedulerStatsMiddleware)
      .create({ config })
    const card = invalidResultCore.newCard({ now: 0 })

    expect(() =>
      invalidResultCore.review({ card, grade: Rating.Good, now: 0 })
    ).toThrow('Expected SM2 memory state')
  })

  function traceMiddleware(name: string, trace: string[]): Middleware {
    return {
      name,
      handlers: {
        review(ctx, next) {
          trace.push(`${name}:review:before:${ctx.input.grade}`)
          const result = next() as { readonly card: { readonly state: State } }
          trace.push(`${name}:review:after:${result.card.state}`)
          return result as never
        },
        rollback(ctx, next) {
          const revlog = ctx.input.revlog as { readonly rating: Rating }
          trace.push(`${name}:rollback:before:${revlog.rating}`)
          const result = next() as { readonly state: State }
          trace.push(`${name}:rollback:after:${result.state}`)
          return result as never
        },
      },
    }
  }

  it('wraps review handlers in array order', () => {
    const trace: string[] = []
    const tracedScheduler = createSM2NumericScheduler().use(
      traceMiddleware('outer', trace),
      traceMiddleware('inner', trace),
      schedulerStatsMiddleware
    )
    const tracedCore = tracedScheduler.create({ config })
    const card = tracedCore.newCard({ now: 0 })

    tracedCore.review({ card: card, grade: Rating.Good, now: 0 })

    expect(trace).toEqual([
      'outer:review:before:3',
      'inner:review:before:3',
      'inner:review:after:2',
      'outer:review:after:2',
    ])
  })

  it('wraps preview review handlers for each grade', () => {
    const trace: string[] = []
    const tracedScheduler = createSM2NumericScheduler().use(
      traceMiddleware('mw', trace),
      schedulerStatsMiddleware
    )
    const tracedCore = tracedScheduler.create({ config })
    const card = tracedCore.newCard({ now: 0 })

    const previews = tracedCore.preview({ card: card, now: 0 })
    expect(trace).toEqual([])

    const iterator = previews[Symbol.iterator]()
    expect(iterator.next().done).toBe(false)
    expect(trace).toEqual(['mw:review:before:1', 'mw:review:after:2'])

    iterator.next()
    iterator.next()
    iterator.next()

    expect(trace).toEqual([
      'mw:review:before:1',
      'mw:review:after:2',
      'mw:review:before:2',
      'mw:review:after:2',
      'mw:review:before:3',
      'mw:review:after:2',
      'mw:review:before:4',
      'mw:review:after:2',
    ])
  })

  it('wraps rollback handlers in array order', () => {
    const trace: string[] = []
    const tracedScheduler = createSM2NumericScheduler().use(
      traceMiddleware('outer', trace),
      traceMiddleware('inner', trace),
      schedulerStatsMiddleware
    )
    const tracedCore = tracedScheduler.create({ config })
    const card = tracedCore.newCard({ now: 0 })
    const first = tracedCore.review({ card: card, grade: Rating.Good, now: 0 })
    const result = tracedCore.review({
      card: first.card,
      grade: Rating.Good,
      now: first.card.scheduledDays,
    })
    trace.length = 0

    tracedCore.rollback({ card: result.card, revlog: result.revlog })

    expect(trace).toEqual([
      'outer:rollback:before:3',
      'inner:rollback:before:3',
      'inner:rollback:after:2',
      'outer:rollback:after:2',
    ])
  })

  it('rejects calling next more than once', () => {
    const badMiddleware = {
      name: badMiddlewareName,
      handlers: {
        review(_ctx, next) {
          next()
          return next()
        },
      },
    } satisfies Middleware
    const badScheduler = createSM2NumericScheduler().use(
      badMiddleware,
      schedulerStatsMiddleware
    )
    const badCore = badScheduler.create({ config })
    const card = badCore.newCard({ now: 0 })

    expect(() =>
      badCore.review({ card: card, grade: Rating.Good, now: 0 })
    ).toThrow('Middleware next() called multiple times')
  })
})

describe('SchedulerCore.preview', () => {
  it('returns results for all grades', () => {
    const card = core.newCard()
    const previews = Array.from(core.preview({ card: card, now: 0 }))

    expect(previews.map((preview) => preview.grade)).toEqual([
      Rating.Again,
      Rating.Hard,
      Rating.Good,
      Rating.Easy,
    ])
  })

  it('returns an iterator in grade order', () => {
    const card = core.newCard()
    const previews = core.preview({ card: card, now: 0 })

    const items = Array.from(previews)

    expect((previews as never as Record<number, unknown>)[Rating.Good]).toBe(
      undefined
    )
    expect(items.map((item) => item.grade)).toEqual([
      Rating.Again,
      Rating.Hard,
      Rating.Good,
      Rating.Easy,
    ])
    expect(items.every((item) => item.card && item.revlog)).toBe(true)
  })

  it('matches individual review calls', () => {
    const card = core.newCard()
    const previews = Array.from(core.preview({ card: card, now: 0 }))

    for (const preview of previews) {
      const individual = core.review({
        card: card,
        grade: preview.grade,
        now: 0,
      })
      expect(preview.card).toEqual(individual.card)
      expect(preview.revlog).toEqual(individual.revlog)
    }
  })

  it('validates card once for all grades', () => {
    const card = core.newCard()
    expect(() => core.preview({ card: card, now: 0 })).not.toThrow()
  })

  it('extracts card memory state once for all grades', () => {
    const validate = vi.spyOn(
      SM2Model.schema.memoryState['~standard'],
      'validate'
    )
    const card = core.newCard()

    validate.mockClear()
    core.preview({ card: card, now: 0 })

    expect(validate).toHaveBeenCalledTimes(1)
    validate.mockRestore()
  })

  it('validates now input', () => {
    const card = core.newCard()
    expect(() => core.preview({ card: card, now: 'bad' as never })).toThrow(
      'Expected finite number'
    )
  })
})

describe('SchedulerCore.rollback', () => {
  it('restores previous card state', () => {
    const card = core.newCard()
    const result = core.review({ card: card, grade: Rating.Good, now: 0 })
    const restored = core.rollback({ card: result.card, revlog: result.revlog })

    expect(restored.state).toBe(State.New)
    expect(restored.scheduleStatus).toBe('new')
    expect(restored.interval).toBe(0)
    expect(restored.reps).toBe(0)
    expect(restored.scheduledDays).toBe(0)
  })

  it('returns an empty card when revlog status is new', () => {
    const card = core.newCard()
    const result = core.review({ card: card, grade: Rating.Good, now: 0 })
    const restored = core.rollback({
      card: result.card,
      revlog: {
        ...result.revlog,
        interval: 30,
        easeFactor: 3,
        reps: 10,
        scheduleStatus: 'new',
        scheduledDays: 0,
      },
    })

    expect(restored.interval).toBe(0)
    expect(restored.easeFactor).toBe(SM2_DEFAULT_WEIGHTS[2])
    expect(restored.reps).toBe(0)
    expect(restored.scheduleStatus).toBe('new')
    expect(restored.scheduledDays).toBe(0)
  })

  it('restores lapses on lapse rollback', () => {
    const card = core.newCard()
    const r1 = core.review({ card: card, grade: Rating.Good, now: 0 })
    const r2 = core.review({
      card: r1.card,
      grade: Rating.Again,
      now: r1.card.scheduledDays,
    })

    expect(r2.card.lapses).toBe(1)

    const restored = core.rollback({ card: r2.card, revlog: r2.revlog })
    expect(restored.lapses).toBe(0)
    expect(restored.state).toBe(State.Review)
  })

  it('returns a mutable card', () => {
    const card = core.newCard()
    const result = core.review({ card: card, grade: Rating.Good, now: 0 })
    const restored = core.rollback({ card: result.card, revlog: result.revlog })

    expect(Object.isFrozen(restored)).toBe(false)
  })

  it('restores only fields that belong to the card shape', () => {
    const dateMiddlewareScheduler = defineScheduler({
      model: SM2Model,
      chrono: dateChrono,
    }).use(sourceMiddleware, schedulerStatsMiddleware)
    const dateMiddlewareCore = dateMiddlewareScheduler.create({
      config: {
        ...config,
        source: 'test-source',
      },
    })
    const card = dateMiddlewareCore.newCard({
      now: new Date('2026-01-01T00:00:00.000Z'),
    })
    const result = dateMiddlewareCore.review({
      card,
      grade: Rating.Good,
      now: new Date('2026-01-03T00:00:00.000Z'),
    })
    const revlog = {
      ...result.revlog,
      dueAt: new Date('2026-01-02T00:00:00.000Z'),
      reviewTime: new Date('2026-01-03T00:00:00.000Z'),
      audit: 'test-source',
    }

    const restored = dateMiddlewareCore.rollback({
      card: {
        ...card,
        ...result.card,
      },
      revlog,
    })
    const restoredFields = restored as Record<string, unknown>

    expect(restored.dueAt).toEqual(revlog.dueAt)
    expect(restored.lastReviewAt).toBeNull()
    expect(restored.source).toBe('test-source')
    expect('audit' in restoredFields).toBe(false)
  })

  it('restores non-new chrono card fields from revlog projection', () => {
    const dateCore = defineScheduler({
      model: SM2Model,
      chrono: dateChrono,
    }).create({ config })
    const card = dateCore.newCard({
      now: new Date('2026-06-28T00:00:00.000Z'),
    })
    const first = dateCore.review({
      card,
      grade: Rating.Good,
      now: new Date('2026-06-30T00:00:00.000Z'),
    })
    const second = dateCore.review({
      card: first.card,
      grade: Rating.Good,
      now: first.card.dueAt,
    })
    const revlog = {
      ...second.revlog,
      dueAt: new Date('2026-06-30T00:00:00.000Z'),
      reviewTime: new Date('2026-07-06T00:00:00.000Z'),
    }

    const restored = dateCore.rollback({
      card: second.card,
      revlog,
    })

    expect(restored.scheduleStatus).toBe('review')
    expect(restored.dueAt).toEqual(revlog.reviewTime)
    expect(restored.lastReviewAt).toEqual(revlog.dueAt)
  })
})

describe('card schema validation', () => {
  it('validates card input', () => {
    expect(() =>
      core.review({ card: {} as never, grade: Rating.Good })
    ).toThrow()
  })

  it('validates model fields via model schema', () => {
    const card = {
      state: State.New,
      interval: 'bad',
      easeFactor: 2.5,
      reps: 0,
      scheduleStatus: 'new',
      scheduledDays: 0,
      elapsedDays: 0,
      lapses: 0,
    }
    expect(() =>
      core.review({ card: card as never, grade: Rating.Good })
    ).toThrow()
  })
})
