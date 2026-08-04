import { describe, expect, it, vi } from 'vitest'
import { defineChrono } from '@/chrono/define-chrono.js'
import { dateChrono } from '@/chrono/presets/date/chrono.js'
import { numericChrono } from '@/chrono/presets/numeric/index.js'
import { defineMiddleware } from '@/middleware/index.js'
import { schedulerStatsMiddleware } from '@/middleware/stats/index.js'
import { defineModel } from '@/model/model.js'
import {
  SM2_DEFAULT_WEIGHTS,
  type SM2Config,
  SM2Model,
} from '@/model/sm2.test.js'
import { gradeSchema, Rating, State } from '@/primitives/index.js'
import { defineSchema, isObject, numberSchema } from '@/schema/index.js'
import { BaseScheduler } from './base.js'
import { useComposeDefaultValue } from './default-value.js'
import { defineScheduler } from './define-scheduler.js'
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
    expect(core.config).toEqual({
      ...config,
      chrono: {},
      clearStatsOnForget: true,
    })
    expect(core.model).not.toBe(SM2Model)
    expect(core.model.config).toEqual({ weights: SM2_DEFAULT_WEIGHTS })
    expect(core.chrono).not.toBe(numericChrono)
    expect(core.chrono.now).toBeTypeOf('function')
  })

  it('supports destructured create()', () => {
    const { create } = createSM2NumericScheduler()
    const destructuredCore = create({ config })

    expect(destructuredCore.newCard()).toHaveProperty('state', State.New)
  })

  it('does not expose desiredRetention on config', () => {
    const c = scheduler.create({
      config: { weights: SM2_DEFAULT_WEIGHTS },
    })

    expect(c.config).toEqual({
      weights: SM2_DEFAULT_WEIGHTS,
      chrono: {},
      clearStatsOnForget: true,
    })
    expect(c.config).not.toHaveProperty('desiredRetention')
  })

  it('rejects invalid config', () => {
    expect(() =>
      scheduler.create({ config: { weights: [1] } as never })
    ).toThrow()
  })

  it('reuses model config parsed by composed scheduler config', () => {
    let configParses = 0
    let createdConfigFrozen = true
    const spiedConfigSchema = defineSchema<SM2Config>((value) => {
      configParses += 1
      return SM2Model.schema.config['~standard'].validate(value)
    })
    const spiedModel = defineModel({
      name: 'sm2-config-spied',
      schema: { ...SM2Model.schema, config: spiedConfigSchema },
      defaultValue: SM2Model.defaultValue,
      create({ config, bypass }) {
        const modelConfig = bypass ? config : Object.freeze(config)
        createdConfigFrozen = Object.isFrozen(modelConfig)
        return SM2Model.create({ config })
      },
    })

    defineScheduler({ model: spiedModel, chrono: numericChrono }).create({
      config: { weights: SM2_DEFAULT_WEIGHTS },
    })

    expect(configParses).toBe(1)
    expect(createdConfigFrozen).toBe(false)
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
    const inheritedMiddleware = defineMiddleware({
      name: 'inheritedConfig',
      schema: { config: inheritedConfigSchema },
    })
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
    expect(card.reviewStep).toBe(0)
    expect(card.reps).toBe(0)
    expect(card.scheduleStatus).toBe('new')
    expect(card).not.toHaveProperty('elapsedDays')
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

  it('keeps created cores isolated when deriving a middleware scheduler', () => {
    const baseScheduler = createSM2NumericScheduler()
    const baseCoreBefore = baseScheduler.create({ config })
    const derivedCore = baseScheduler
      .use(sourceMiddleware, schedulerStatsMiddleware)
      .create({
        config: {
          ...config,
          source: 'derived-source',
        },
      })
    const baseCoreAfter = baseScheduler.create({ config })

    const beforeCard = baseCoreBefore.newCard()
    const derivedCard = derivedCore.newCard()
    const afterCard = baseCoreAfter.newCard()
    const beforeReview = baseCoreBefore.review({
      card: beforeCard,
      grade: Rating.Good,
      now: 1,
    })
    const derivedReview = derivedCore.review({
      card: derivedCard,
      grade: Rating.Good,
      now: 1,
    })
    const afterReview = baseCoreAfter.review({
      card: afterCard,
      grade: Rating.Good,
      now: 1,
    })

    expect(beforeReview.card).not.toHaveProperty('source')
    expect(beforeReview.card).not.toHaveProperty('reps')
    expect(derivedReview.card).toMatchObject({
      source: 'derived-source',
      reps: 1,
      lapses: 0,
    })
    expect(derivedReview.revlog).toHaveProperty('audit', 'derived-source')
    expect(afterReview.card).not.toHaveProperty('source')
    expect(afterReview.card).not.toHaveProperty('reps')
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
    expect(() => core.newCard(null as never)).toThrow(
      'Expected card init input object'
    )
  })

  it('parses explicit and fallback now exactly once', () => {
    let timeParses = 0
    const timeSchema = defineSchema<number, number>((value) => {
      timeParses += 1
      return typeof value === 'number'
        ? { value: value + 1 }
        : { issues: [{ message: 'Expected test time' }] }
    })
    const cardSchema = defineSchema<
      { readonly dueAt?: number },
      { readonly dueAt: number }
    >((value) =>
      isObject(value) && typeof value.dueAt === 'number'
        ? { value: { dueAt: value.dueAt } }
        : { issues: [{ message: 'Expected test dueAt' }] }
    )
    const transformingChrono = defineChrono({
      schema: { time: timeSchema, card: cardSchema },
      projection(value) {
        return {
          value: { previous: value.time, current: value.time },
        }
      },
      defaultValue: {
        card({ time }) {
          return { dueAt: time }
        },
      },
      create() {
        return {
          now: () => 10,
          difference: (from, to) => to - from,
          add: (from, days) => from + days,
        }
      },
    })
    const transformingCore = defineScheduler({
      model: SM2Model,
      chrono: transformingChrono,
    }).create({ config })

    expect(transformingCore.newCard({ now: 1 }).dueAt).toBe(2)
    expect(timeParses).toBe(1)
    expect(transformingCore.newCard().dueAt).toBe(10)
    expect(timeParses).toBe(1)
  })

  it('applies middleware card defaults', () => {
    const card = middlewareCore.newCard()

    expect(card.source).toBe('test-source')
  })

  it('allows middleware card fields to be injected', () => {
    const card = middlewareCore.newCard({
      now: 0,
      source: 'injected-source',
    })

    expect(card.source).toBe('injected-source')
  })

  it('validates injected middleware card fields', () => {
    expect(() =>
      middlewareCore.newCard({
        source: 1 as never,
      })
    ).toThrow('Expected source card init input')
  })

  it('applies middleware added through use()', () => {
    const card = usedCore.newCard()

    expect(card.source).toBe('used-source')
  })

  it('calls config-only middleware card defaults for each new card', () => {
    const cardDefault = vi.fn(
      (ctx: { readonly config: { source: string } }) => ({
        source: ctx.config.source,
      })
    )
    const cachedMiddleware = defineMiddleware({
      name: cachedMiddlewareName,
      schema: {
        config: sourceConfigSchema,
        card: sourceCardSchema,
      },
      defaultValue: {
        card: cardDefault,
      },
    })
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
    expect(cardDefault).toHaveBeenCalledTimes(2)
  })

  it('lets middleware read config fields from the top-level config', () => {
    const trace: string[] = []
    const firstName = 'first'
    const secondName = 'second'
    const firstConfigSchema = defineStringFieldConfigSchema('firstSource')
    const secondConfigSchema = defineStringFieldConfigSchema('secondSource')
    const firstMiddleware = defineMiddleware({
      name: firstName,
      schema: { config: firstConfigSchema, card: sourceCardSchema },
      defaultValue: {
        card(ctx) {
          trace.push(`first:${ctx.config.firstSource}`)
          return { source: 'first' }
        },
      },
    })
    const secondMiddleware = defineMiddleware({
      name: secondName,
      schema: { config: secondConfigSchema, card: sourceCardSchema },
      defaultValue: {
        card(ctx) {
          trace.push(`second:${ctx.config.secondSource}`)
          return { source: 'second' }
        },
      },
    })
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
    const retentionMiddleware = defineMiddleware({
      name: retentionMiddlewareName,
      handlers: {
        review(ctx, next) {
          seen.push(ctx.desiredRetention)
          ctx.desiredRetention = 0.5
          next()
          if (ctx.scheduledDays === undefined) {
            throw new Error('Expected scheduledDays')
          }
          seen.push(ctx.scheduledDays)
        },
      },
    })
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

    expect(seen).toEqual([0.9, 7])
    expect(result.card.interval).toBe(1)
  })

  it('lets middleware derive desiredRetention from candidate memory state', () => {
    const seen: unknown[] = []
    const candidateMiddleware = defineMiddleware({
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
          next()
        },
      },
    })
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
        reviewStep: 1,
      },
      7,
    ])
    expect(result.card.interval).toBe(1)
  })

  it('caches nextInterval by memory state and desired retention', () => {
    const seen: number[] = []
    const candidateMiddleware = defineMiddleware({
      name: Symbol('candidate-retention-cache'),
      handlers: {
        review(ctx, next) {
          const memoryState = ctx.candidate.step(ctx.input.grade)
          seen.push(ctx.candidate.nextInterval(memoryState, 0.9))
          seen.push(ctx.candidate.nextInterval(memoryState, 0.5))
          next()
        },
      },
    })
    const candidateCore = createSM2NumericScheduler()
      .use(candidateMiddleware, schedulerStatsMiddleware)
      .create({ config: { weights: SM2_DEFAULT_WEIGHTS } })
    const card = candidateCore.newCard({ now: 0 })

    candidateCore.review({
      card,
      grade: Rating.Good,
      now: 0,
    })

    expect(seen).toEqual([1, 7])
  })

  it('lets middleware read the previous grade candidate separately', () => {
    const seen: unknown[] = []
    const candidateMiddleware = defineMiddleware({
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
          next()
        },
      },
    })
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

    const cumulativeMiddleware = defineMiddleware({
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
          next()
        },
      },
    })

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
      now: r1.card.interval,
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
    expect(result.revlog.reviewStep).toBe(0)
    expect(result.revlog).not.toHaveProperty('reps')
    expect(result.revlog).not.toHaveProperty('lapses')
  })

  it('records rating and state in core revlog without stats middleware', () => {
    const baseCore = createSM2NumericScheduler().create({ config })
    const card = baseCore.newCard()
    const result = baseCore.review({ card, grade: Rating.Good })

    expect(result.revlog.rating).toBe(Rating.Good)
    expect(result.revlog.state).toBe(State.New)
    expect(result.revlog).not.toHaveProperty('elapsedDays')
  })

  it('chains multiple reviews correctly', () => {
    const card = core.newCard()
    const r1 = core.review({ card: card, grade: Rating.Good, now: 0 })
    const r2 = core.review({
      card: r1.card,
      grade: Rating.Good,
      now: r1.card.interval,
    })
    const r3 = core.review({
      card: r2.card,
      grade: Rating.Good,
      now: r1.card.interval + r2.card.interval,
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

  it('validates grade input', () => {
    const card = core.newCard()
    expect(() =>
      core.review({ card, grade: Rating.Manual as never, now: 0 })
    ).toThrow('Expected grade')
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
  it('applies review and preview chrono defaults after middleware unwinds', () => {
    const seen: unknown[] = []
    const middleware = defineMiddleware({
      name: Symbol('review-chrono-order'),
      handlers: {
        review(ctx, next) {
          next()
          seen.push(structuredClone(ctx.result.card))
          ctx.scheduledDays = 5
        },
      },
    })
    const dateCore = defineScheduler({
      model: SM2Model,
      chrono: dateChrono,
    })
      .use(middleware)
      .create({ config })
    const createdAt = new Date('2026-01-01T00:00:00.000Z')
    const reviewedAt = new Date('2026-01-02T00:00:00.000Z')
    const card = dateCore.newCard({ now: createdAt })

    const result = dateCore.review({
      card,
      grade: Rating.Good,
      now: reviewedAt,
    })
    const preview = Array.from(dateCore.preview({ card, now: reviewedAt }))

    expect(seen).toHaveLength(5)
    for (const draft of seen) expect(draft).not.toHaveProperty('dueAt')
    expect(result.card.dueAt).toEqual(new Date('2026-01-07T00:00:00.000Z'))
    expect(preview.map((item) => item.card.dueAt)).toEqual([
      new Date('2026-01-07T00:00:00.000Z'),
      new Date('2026-01-07T00:00:00.000Z'),
      new Date('2026-01-07T00:00:00.000Z'),
      new Date('2026-01-07T00:00:00.000Z'),
    ])
  })

  it('requires short-circuiting review middleware to provide scheduledDays', () => {
    const middleware = defineMiddleware({
      name: Symbol('review-chrono-short-circuit'),
      handlers: {
        review() {},
      },
    })
    const dateCore = defineScheduler({
      model: SM2Model,
      chrono: dateChrono,
    })
      .use(middleware)
      .create({ config })
    const now = new Date('2026-01-01T00:00:00.000Z')
    const card = dateCore.newCard({ now })

    expect(() => dateCore.review({ card, grade: Rating.Good, now })).toThrow(
      'Expected scheduledDays after review middleware'
    )
    expect(() => Array.from(dateCore.preview({ card, now }))).toThrow(
      'Expected scheduledDays after review middleware'
    )
  })

  it('applies rollback chrono defaults after middleware unwinds', () => {
    const seen: unknown[] = []
    const middleware = defineMiddleware({
      name: Symbol('rollback-chrono-order'),
      handlers: {
        rollback(ctx, next) {
          next()
          seen.push(structuredClone(ctx.result.card))
        },
      },
    })
    const dateCore = defineScheduler({
      model: SM2Model,
      chrono: dateChrono,
    })
      .use(middleware)
      .create({ config })
    const card = dateCore.newCard({
      now: new Date('2026-01-01T00:00:00.000Z'),
    })
    const reviewed = dateCore.review({
      card,
      grade: Rating.Good,
      now: new Date('2026-01-02T00:00:00.000Z'),
    })

    const restored = dateCore.rollback(reviewed)

    expect(seen[0]).not.toHaveProperty('dueAt')
    expect(restored.dueAt).toEqual(reviewed.revlog.reviewTime)
    expect(restored.lastReviewAt).toEqual(reviewed.revlog.dueAt)
  })

  it('throws when review middleware mutates input fields', () => {
    const card = core.newCard({ now: 0 })

    for (const field of ['card', 'grade', 'now'] as const) {
      const mutatingMiddleware = defineMiddleware({
        name: Symbol(`mutate-${field}`),
        handlers: {
          review(ctx, next) {
            ;(ctx.input as Record<typeof field, unknown>)[field] = null
            next()
          },
        },
      })
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
    const resultMiddleware = defineMiddleware({
      name: Symbol('seed-result'),
      handlers: {
        review(ctx, next) {
          seen.push(structuredClone(ctx.result))
          next()
        },
      },
    })
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

  it('lets review middleware read the immutable now input', () => {
    const seen: unknown[] = []
    const inputMiddleware = defineMiddleware({
      name: Symbol('input-now'),
      handlers: {
        review(ctx, next) {
          seen.push(ctx.input.now)
          next()
        },
      },
    })
    const inputCore = createSM2NumericScheduler()
      .use(inputMiddleware, schedulerStatsMiddleware)
      .create({ config })
    const card = inputCore.newCard({ now: 0 })

    inputCore.review({ card, grade: Rating.Good, now: 7 })

    expect(seen).toEqual([7])
  })

  it('validates the final review result with scheduler schemas', () => {
    const invalidResultMiddleware = defineMiddleware({
      name: Symbol('invalid-result'),
      handlers: {
        review(ctx, next) {
          next()
          const runtimeCtx = ctx as {
            readonly result: {
              readonly card: Record<string, unknown>
            }
          }
          delete runtimeCtx.result.card.interval
        },
      },
    })
    const invalidResultCore = createSM2NumericScheduler()
      .use(invalidResultMiddleware, schedulerStatsMiddleware)
      .create({ config })
    const card = invalidResultCore.newCard({ now: 0 })

    expect(() =>
      invalidResultCore.review({ card, grade: Rating.Good, now: 0 })
    ).toThrow('Expected SM2 memory state')
  })

  function traceMiddleware(name: string, trace: string[]) {
    return defineMiddleware({
      name,
      handlers: {
        review(ctx, next) {
          trace.push(`${name}:review:before:${ctx.input.grade}`)
          next()
          trace.push(`${name}:review:after:${ctx.result.card.state}`)
        },
        rollback(ctx, next) {
          const revlog = ctx.input.revlog as { readonly rating: Rating }
          trace.push(`${name}:rollback:before:${revlog.rating}`)
          next()
          trace.push(`${name}:rollback:after:${ctx.result.card.state}`)
        },
      },
    })
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
      now: first.card.interval,
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
    const badMiddleware = defineMiddleware({
      name: badMiddlewareName,
      handlers: {
        review(_ctx, next) {
          next()
          next()
        },
      },
    })
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

  it('uses chrono now when preview time is omitted', () => {
    const card = core.newCard()

    expect(
      Array.from(core.preview({ card })).map((item) => item.grade)
    ).toEqual([Rating.Again, Rating.Hard, Rating.Good, Rating.Easy])
  })
})

describe('SchedulerCore.forward', () => {
  it('returns one card and revlog per review', () => {
    const results = core.forward({
      history: [
        { rating: Rating.Good, reviewTime: 0 },
        { rating: Rating.Good, reviewTime: 1 },
        { rating: Rating.Again, reviewTime: 4 },
      ],
    })

    expect(results).toHaveLength(3)
    expect(results[0].revlog.rating).toBe(Rating.Good)
    expect(results[0].revlog.state).toBe(State.New)
    expect(results[2].revlog.rating).toBe(Rating.Again)
    expect(results[2].card.reps).toBe(3)
    expect(results[2].card.lapses).toBe(1)
  })

  it('reuses parsed cards and typed grades', () => {
    const cardValidate = vi.spyOn(
      scheduler.schema.card['~standard'],
      'validate'
    )
    const gradeValidate = vi.spyOn(gradeSchema['~standard'], 'validate')

    core.forward({
      history: [
        { rating: Rating.Good, reviewTime: 0 },
        { rating: Rating.Hard, reviewTime: 1 },
        { rating: Rating.Easy, reviewTime: 3 },
      ],
    })

    expect(cardValidate).toHaveBeenCalledTimes(4)
    expect(gradeValidate).toHaveBeenCalledTimes(3)
    cardValidate.mockRestore()
    gradeValidate.mockRestore()
  })

  it('matches an equivalent chain of review calls', () => {
    const history = [
      { rating: Rating.Good, reviewTime: 0 },
      { rating: Rating.Hard, reviewTime: 2 },
      { rating: Rating.Easy, reviewTime: 7 },
    ] as const

    const forwarded = core.forward({ history })

    let card = core.newCard({ now: history[0].reviewTime })
    const expected = history.map((review) => {
      const result = core.review({
        card,
        grade: review.rating,
        now: review.reviewTime,
      })
      card = result.card
      return result
    })

    expect(forwarded).toEqual(expected)
  })

  it('starts from the given initial card', () => {
    const seeded = core.review({
      card: core.newCard({ now: 0 }),
      grade: Rating.Good,
      now: 0,
    })

    const results = core.forward({
      initialCard: seeded.card,
      history: [{ rating: Rating.Good, reviewTime: 1 }],
    })

    expect(results).toHaveLength(1)
    expect(results[0].revlog.state).toBe(State.Review)
    expect(results[0].card.reps).toBe(2)
  })

  it('rejects an invalid initial card', () => {
    expect(() =>
      core.forward({
        initialCard: { state: 'not-a-state' } as never,
        history: [{ rating: Rating.Good, reviewTime: 0 }],
      })
    ).toThrow()
  })

  it('returns an empty array for an empty history', () => {
    expect(core.forward({ history: [] })).toEqual([])
  })

  it('skips the initial card entirely when there is no review', () => {
    expect(
      core.forward({
        initialCard: { state: 'not-a-state' } as never,
        history: [],
      })
    ).toEqual([])
  })
})

describe('SchedulerCore.forget', () => {
  it('resets a reviewed card through new-card defaults without a revlog', () => {
    const card = core.newCard({ now: 0 })
    const first = core.review({ card, grade: Rating.Good, now: 0 })
    const second = core.review({
      card: first.card,
      grade: Rating.Again,
      now: first.card.interval,
    })

    const forgotten = core.forget({ card: second.card, now: 9 })

    expect(forgotten.state).toBe(State.New)
    expect(forgotten.scheduleStatus).toBe('new')
    expect(forgotten.interval).toBe(0)
    expect(forgotten.easeFactor).toBe(SM2_DEFAULT_WEIGHTS[2])
    expect(forgotten.reviewStep).toBe(0)
    expect(forgotten.reps).toBe(0)
    expect(forgotten.lapses).toBe(0)
    expect(forgotten).not.toHaveProperty('rating')
  })

  it('can preserve stats from the forgotten card', () => {
    const preserveCore = scheduler.create({
      config: {
        ...config,
        clearStatsOnForget: false,
      },
    })
    const card = preserveCore.newCard({ now: 0 })
    const first = preserveCore.review({ card, grade: Rating.Good, now: 0 })
    const second = preserveCore.review({
      card: first.card,
      grade: Rating.Again,
      now: first.card.interval,
    })

    const forgotten = preserveCore.forget({ card: second.card, now: 9 })

    expect(forgotten.state).toBe(State.New)
    expect(forgotten.interval).toBe(0)
    expect(forgotten.reps).toBe(2)
    expect(forgotten.lapses).toBe(1)
  })

  it('passes old card data to middleware defaults only for forget', () => {
    const seen: string[] = []
    const contextMiddleware = defineMiddleware({
      name: 'forgetDefaultContext',
      schema: {
        card: sourceCardSchema,
      },
      defaultValue: {
        card(ctx) {
          if (ctx.operation === 'newCard') {
            seen.push('none')
            return { source: 'fresh' }
          }
          seen.push(ctx.input.scheduleStatus)
          return { source: ctx.input.source }
        },
      },
    })
    const contextCore = createSM2NumericScheduler()
      .use(contextMiddleware, schedulerStatsMiddleware)
      .create({ config })
    const card = contextCore.newCard({ now: 0 })

    const forgotten = contextCore.forget({
      card: { ...card, source: 'old-source' },
      now: 1,
    })

    expect(seen).toEqual(['none', 'new'])
    expect(forgotten.source).toBe('old-source')
  })

  it('uses chrono card defaults at the forget time', () => {
    const dateCore = defineScheduler({
      model: SM2Model,
      chrono: dateChrono,
    })
      .use(schedulerStatsMiddleware)
      .create({ config })
    const first = new Date('2026-01-01T00:00:00.000Z')
    const second = new Date('2026-01-02T00:00:00.000Z')
    const forgottenAt = new Date('2026-02-01T00:00:00.000Z')
    const card = dateCore.newCard({ now: first })
    const reviewed = dateCore.review({
      card,
      grade: Rating.Good,
      now: second,
    })

    const forgotten = dateCore.forget({
      card: reviewed.card,
      now: forgottenAt,
    })

    expect(forgotten.state).toBe(State.New)
    expect(forgotten.dueAt).toBe(forgottenAt)
    expect(forgotten.lastReviewAt).toBe(null)
  })

  it('uses chrono now when forget time is omitted', () => {
    const dateCore = defineScheduler({
      model: SM2Model,
      chrono: dateChrono,
    })
      .use(schedulerStatsMiddleware)
      .create({ config })
    const card = dateCore.newCard({
      now: new Date('2026-01-01T00:00:00.000Z'),
    })

    const forgotten = dateCore.forget({ card })

    expect(forgotten.dueAt).toBeInstanceOf(Date)
    expect(forgotten.lastReviewAt).toBe(null)
  })

  it('returns a mutable card', () => {
    const card = core.newCard()
    const result = core.review({ card, grade: Rating.Good, now: 0 })
    const forgotten = core.forget({ card: result.card, now: 1 })

    expect(Object.isFrozen(forgotten)).toBe(false)
  })

  it('validates card input', () => {
    expect(() => core.forget({ card: {} as never, now: 0 })).toThrow()
  })

  it('validates now input', () => {
    const card = core.newCard()

    expect(() => core.forget({ card, now: 'bad' as never })).toThrow(
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
  })

  it('runs rollback handlers when revlog state is new', () => {
    const card = core.newCard()
    const result = core.review({ card: card, grade: Rating.Good, now: 0 })
    const restored = core.rollback({
      card: result.card,
      revlog: {
        ...result.revlog,
        scheduleStatus: 'review',
      },
    })

    expect(restored.interval).toBe(0)
    expect(restored.easeFactor).toBe(SM2_DEFAULT_WEIGHTS[2])
    expect(restored.reps).toBe(0)
    expect(restored.state).toBe(State.New)
    expect(restored.scheduleStatus).toBe('review')
  })

  it('does not reset stats when revlog state is new', () => {
    const card = core.newCard()
    const first = core.review({ card: card, grade: Rating.Good, now: 0 })
    const second = core.review({
      card: first.card,
      grade: Rating.Good,
      now: first.card.interval,
    })
    const restored = core.rollback({
      card: second.card,
      revlog: {
        ...second.revlog,
        state: State.New,
        scheduleStatus: 'new',
      },
    })

    expect(restored.interval).toBe(1)
    expect(restored.easeFactor).toBe(SM2_DEFAULT_WEIGHTS[2])
    expect(restored.reps).toBe(1)
    expect(restored.state).toBe(State.New)
    expect(restored.scheduleStatus).toBe('new')
  })

  it('restores lapses on lapse rollback', () => {
    const card = core.newCard()
    const r1 = core.review({ card: card, grade: Rating.Good, now: 0 })
    const r2 = core.review({
      card: r1.card,
      grade: Rating.Again,
      now: r1.card.interval,
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

    expect(restored.dueAt).toEqual(revlog.reviewTime)
    expect(restored.lastReviewAt).toEqual(revlog.dueAt)
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

  it('allows rollback when chrono card defaults are absent', () => {
    const optionalNumberFields = defineSchema<
      unknown,
      { readonly previous: number; readonly current: number }
    >((value) =>
      isObject(value)
        ? {
            value: {
              previous: typeof value.previous === 'number' ? value.previous : 0,
              current: typeof value.current === 'number' ? value.current : 0,
            },
          }
        : { issues: [{ message: 'Expected optional number fields' }] }
    )
    const projectionSchema = defineSchema<
      | { readonly card: { readonly previous: number }; readonly time: number }
      | {
          readonly revlog: {
            readonly previous: number
            readonly current: number
          }
        },
      { readonly previous: number; readonly current: number }
    >((value) => {
      if (!isObject(value)) {
        return { issues: [{ message: 'Expected optional projection input' }] }
      }
      if ('card' in value) {
        const time = typeof value.time === 'number' ? value.time : 0
        return { value: { previous: 0, current: time } }
      }

      return optionalNumberFields['~standard'].validate(value.revlog)
    })
    const noCardDefaultChrono = defineChrono({
      schema: {
        card: optionalNumberFields,
        revlog: optionalNumberFields,
        time: numberSchema,
      },
      projection: projectionSchema,
      create() {
        return {
          now: () => 0,
          difference: (from: number, to: number) => to - from,
          add: (from: number, days: number) => from + days,
        }
      },
    })
    const noCardDefaultCore = defineScheduler({
      model: SM2Model,
      chrono: noCardDefaultChrono,
    }).create({ config })
    const card = {
      interval: 1,
      easeFactor: SM2_DEFAULT_WEIGHTS[2],
      reviewStep: 1,
      previous: 0,
      current: 1,
      state: State.Review,
      scheduleStatus: 'review' as const,
    }
    const result = noCardDefaultCore.review({
      card,
      grade: Rating.Good,
      now: 1,
    })

    const restored = noCardDefaultCore.rollback({
      card: result.card,
      revlog: result.revlog,
    })

    expect(restored.scheduleStatus).toBe('review')
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
      reviewStep: 0,
      scheduleStatus: 'new',
      lapses: 0,
    }
    expect(() =>
      core.review({ card: card as never, grade: Rating.Good })
    ).toThrow()
  })

  it('requires composed card parsing to preserve model memory state', () => {
    const unmarkedCardSchema = defineSchema<unknown, Record<string, unknown>>(
      (value) =>
        isObject(value)
          ? { value }
          : { issues: [{ message: 'Expected card object' }] }
    )
    const scheduler = createSM2NumericScheduler()
    // biome-ignore lint/suspicious/noExplicitAny: malformed schema runtime test
    const unmarkedCore = new BaseScheduler<any>({
      model: SM2Model,
      chrono: numericChrono,
      schema: {
        ...scheduler.schema,
        card: unmarkedCardSchema,
      },
      defaultValue: useComposeDefaultValue({
        model: SM2Model,
        chrono: numericChrono,
        middlewares: [],
      }),
      config,
    })

    expect(() =>
      unmarkedCore.review({
        card: {
          interval: 0,
          easeFactor: SM2_DEFAULT_WEIGHTS[2],
          reviewStep: 0,
          state: State.New,
          scheduleStatus: 'new',
        },
        grade: Rating.Good,
        now: 0,
      })
    ).toThrow('Parsed scheduler card is missing model memory state')
  })
})
