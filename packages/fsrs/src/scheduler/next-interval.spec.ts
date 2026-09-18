import {
  type AnySchedulerCore,
  defineMiddleware,
  defineScheduler,
  grades,
  type Mutable,
  type NextIntervalMiddlewareHandler,
  Rating,
  type ReviewCandidateContext,
  State,
  schedulerStatsMiddleware,
} from '@open-spaced-repetition/srs-kit'
import { dateChrono } from '@open-spaced-repetition/srs-kit/chrono/date'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { schedulerDesiredRetentionMiddleware } from '@/middlewares/desired-retention/middleware.js'
import { createSchedulerFuzzingMiddleware } from '@/middlewares/fuzzing/middleware.js'
import { schedulerLearningStepsMiddleware } from '@/middlewares/learning-steps/middleware.js'
import type { StepUnit } from '@/middlewares/learning-steps/types.js'
import { schedulerMaximumIntervalMiddleware } from '@/middlewares/maximum-interval/middleware.js'
import { schedulerMonotonicIntervalMiddleware } from '@/middlewares/monotonic-interval/middleware.js'
import { schedulerScheduledDaysMiddleware } from '@/middlewares/scheduled-days/middleware.js'
import { FSRS7_DEFAULT_WEIGHTS } from '@/models/fsrs-7/constants.js'
import { FSRS7Model } from '@/models/fsrs-7/model.js'
import { DefaultScheduler } from './default-scheduler.js'

const now = new Date('2026-01-10T00:00:00Z')
const before = new Date('2026-01-01T00:00:00Z')
const DAY = 86_400_000

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('scheduler.nextInterval', () => {
  it('preserves onion order between interval policies and review writebacks', () => {
    const clamp = defineMiddleware({
      name: 'interval-clamp',
      handlers: {
        nextInterval(ctx, next) {
          next()
          ctx.scheduledDays = Math.min(ctx.scheduledDays ?? 0, 2)
        },
      },
    })
    const rewrite = defineMiddleware({
      name: 'review-writeback',
      handlers: {
        review(ctx, next) {
          next()
          ctx.scheduledDays = 10
        },
      },
    })
    const definition = defineScheduler({
      model: FSRS7Model,
      chrono: dateChrono,
    })
    for (const [core, expected] of [
      [
        definition
          .use(clamp, rewrite)
          .create({ config: { weights: FSRS7_DEFAULT_WEIGHTS } }),
        2,
      ],
      [
        definition
          .use(rewrite, clamp)
          .create({ config: { weights: FSRS7_DEFAULT_WEIGHTS } }),
        10,
      ],
    ] as const) {
      const card = core.newCard({ now })
      const review = core.review({ card, grade: Rating.Easy, now })
      expect((review.card.dueAt.getTime() - now.getTime()) / DAY).toBe(expected)
      expect(
        Array.from(core.preview({ card, now })).map(
          (item) => (item.card.dueAt.getTime() - now.getTime()) / DAY
        )
      ).toEqual([expected, expected, expected, expected])
    }
  })

  it('shares interval hooks while keeping review effects out of queries', () => {
    const review = vi.fn<NextIntervalMiddlewareHandler>((_ctx, next) => next())
    const nextInterval = vi.fn<NextIntervalMiddlewareHandler>((_ctx, next) =>
      next()
    )
    const queryOnly = vi.fn<NextIntervalMiddlewareHandler>((ctx, next) => {
      ctx.scheduledDays = 42
      next()
    })
    const core = defineScheduler({ model: FSRS7Model, chrono: dateChrono })
      .use(
        defineMiddleware({
          name: 'query-only',
          handlers: { nextInterval: queryOnly },
        }),
        defineMiddleware({
          name: 'operation-handlers',
          handlers: { review, nextInterval },
        })
      )
      .create({ config: { weights: FSRS7_DEFAULT_WEIGHTS } })
    const card = core.newCard({ now })
    const result = core.review({ card, grade: Rating.Good, now })
    Array.from(core.preview({ card, now }))
    core.forward({
      initialCard: card,
      history: [{ rating: Rating.Good, reviewTime: now }],
    })
    expect(review).toHaveBeenCalledTimes(6)
    expect(nextInterval).toHaveBeenCalledTimes(6)
    expect(queryOnly).toHaveBeenCalledTimes(6)

    expect(
      core.nextInterval(result.card, 0.9, {
        card,
        grade: Rating.Good,
        elapsedDays: 0,
      })
    ).toBe(42)
    expect(review).toHaveBeenCalledTimes(6)
    expect(nextInterval).toHaveBeenCalledTimes(7)
    expect(queryOnly).toHaveBeenCalledTimes(7)
  })

  it.each([
    'FSRS-6',
    'FSRS-7',
  ] as const)('matches the final review delay across %s policies', async (version) => {
    for (const enableFuzz of [false, true]) {
      for (const enableShortTerm of [false, true]) {
        for (const maximumInterval of [1, 36500]) {
          for (const learningSteps of [
            ['1m', '10m'],
            ['0m', '10m'],
            ['0m'],
            [],
          ] satisfies StepUnit[][]) {
            const core: AnySchedulerCore = await DefaultScheduler({
              version,
              enableFuzz,
              enableShortTerm,
              maximumInterval,
              learningSteps,
              relearningSteps: learningSteps,
            })
            for (const state of [
              State.New,
              State.Learning,
              State.Review,
              State.Relearning,
            ]) {
              for (const learningStep of [0, 1]) {
                const card = Object.assign(
                  core.newCard({ now: before, cardId: 'query-parity' }),
                  {
                    state,
                    learningStep,
                    stability: state === State.New ? 0 : 10,
                    difficulty: state === State.New ? 0 : 5,
                    lastReviewAt: state === State.New ? null : before,
                  }
                )
                if ('stabilityFast' in card && state !== State.New) {
                  card.stabilityFast = 0.1
                }
                const elapsedDays = state === State.New ? 0 : 9
                for (const grade of grades) {
                  const result = core.review({ card, grade, now })
                  const interval = core.nextInterval(result.card, 0.9, {
                    card,
                    grade,
                    elapsedDays,
                  })
                  expect(Math.trunc(now.getTime() + interval * DAY)).toBe(
                    result.card.dueAt.getTime()
                  )
                }
              }
            }
          }
        }
      }
    }
  })

  it('reuses the supplied FSRS-7 state without review or chronology effects', () => {
    const review = vi.fn((_ctx, next: () => void) => next())
    const rollback = vi.fn((_ctx, next: () => void) => next())
    const core = defineScheduler({ model: FSRS7Model, chrono: dateChrono })
      .use(
        schedulerDesiredRetentionMiddleware,
        createSchedulerFuzzingMiddleware(),
        schedulerStatsMiddleware,
        schedulerScheduledDaysMiddleware,
        schedulerLearningStepsMiddleware,
        schedulerMaximumIntervalMiddleware,
        schedulerMonotonicIntervalMiddleware,
        defineMiddleware({ name: 'effects', handlers: { review, rollback } })
      )
      .create({
        config: {
          weights: FSRS7_DEFAULT_WEIGHTS,
          desiredRetention: 0.9,
          enableFuzz: false,
          enableShortTerm: false,
          learningSteps: [],
          relearningSteps: [],
          maximumInterval: 100,
        },
      })
    const card = Object.freeze(core.newCard({ now }))
    const state = Object.freeze({
      stability: 11,
      stabilityFast: 0.1,
      difficulty: 4,
    })
    const expected = Math.min(
      core.model.nextInterval(state, 0.8),
      core.config.maximumInterval
    )
    const step = vi.spyOn(core.model, 'step')
    const curve = vi.spyOn(core.model, 'forgettingCurve')
    const modelInterval = vi.spyOn(core.model, 'nextInterval')
    const chronology = (['now', 'compare', 'difference', 'add'] as const).map(
      (key) => vi.spyOn(core.chrono, key)
    )
    const date = vi.fn<NonNullable<ProxyHandler<typeof Date>['construct']>>(
      (target, args) => Reflect.construct(target, args)
    )
    const clock = vi.spyOn(Date, 'now')
    vi.stubGlobal('Date', new Proxy(Date, { construct: date }))

    expect(
      core.nextInterval(state, 0.8, {
        card,
        grade: Rating.Again,
        elapsedDays: 0,
      })
    ).toBe(expected)
    expect(modelInterval).toHaveBeenCalledExactlyOnceWith(state, 0.8)
    expect(step).not.toHaveBeenCalled()
    expect(curve).not.toHaveBeenCalled()
    expect(review).not.toHaveBeenCalled()
    expect(rollback).not.toHaveBeenCalled()
    expect(date).not.toHaveBeenCalled()
    expect(clock).not.toHaveBeenCalled()
    for (const call of chronology) expect(call).not.toHaveBeenCalled()
    expect(card.reps).toBe(0)
    expect(card.learningStep).toBe(0)
  })

  it('lets a shared interval policy override retention using the post-rating state', () => {
    const policy = vi.fn()
    const applyRetention: NextIntervalMiddlewareHandler = (ctx, next) => {
      const state = ctx.candidate.step(ctx.input.grade)
      policy(state)
      ctx.desiredRetention = Number(state.stabilityFast) > 0 ? 0.7 : 0.8
      next()
    }
    const adr = defineMiddleware({
      name: 'cost-adr',
      handlers: {
        nextInterval: applyRetention,
      },
    })
    const core = defineScheduler({ model: FSRS7Model, chrono: dateChrono })
      .use(schedulerDesiredRetentionMiddleware, adr)
      .create({
        config: { weights: FSRS7_DEFAULT_WEIGHTS, desiredRetention: 0.9 },
      })
    const card = core.newCard({ now })
    const result = core.review({ card, grade: Rating.Good, now })
    const expected = core.model.nextInterval(result.card, 0.7)
    const step = vi.spyOn(core.model, 'step')
    const interval = vi.spyOn(core.model, 'nextInterval')
    expect(
      core.nextInterval(result.card, 0.95, {
        card,
        grade: Rating.Good,
        elapsedDays: 0,
      })
    ).toBe(expected)
    expect(result.card.dueAt.getTime()).toBe(
      Math.trunc(now.getTime() + expected * DAY)
    )
    expect(interval).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ stabilityFast: result.card.stabilityFast }),
      0.7
    )
    expect(policy).toHaveBeenCalledTimes(2)
    expect(step).not.toHaveBeenCalled()
  })

  it('shares candidate caches and installed decorators through repeated preview consumption', () => {
    const candidates = new Set<ReviewCandidateContext>()
    const decorated = new WeakSet<ReviewCandidateContext>()
    const visits = vi.fn()
    let installations = 0
    const observeCandidate: NextIntervalMiddlewareHandler = (ctx, next) => {
      const candidate = ctx.candidate as Mutable<ReviewCandidateContext>
      if (!candidates.has(candidate)) {
        candidates.add(candidate)
        let interval = candidate.nextInterval
        Object.defineProperty(candidate, 'nextInterval', {
          get: () => interval,
          set(value) {
            installations++
            interval = value
          },
        })
      }
      next()
    }
    const probe = defineMiddleware({
      name: 'candidate-probe',
      handlers: {
        nextInterval: observeCandidate,
      },
    })
    const overrideInterval: NextIntervalMiddlewareHandler = (ctx, next) => {
      const candidate = ctx.candidate as Mutable<ReviewCandidateContext>
      if (!decorated.has(candidate)) {
        decorated.add(candidate)
        const interval = candidate.nextInterval
        candidate.nextInterval = (state, retention) => {
          visits(candidate.findGrade(state), retention)
          return interval(state, retention) + 1
        }
      }
      next()
    }
    const override = defineMiddleware({
      name: 'interval-override',
      handlers: {
        nextInterval: overrideInterval,
      },
    })
    const sample = vi.fn(() => 0.5)
    const rng = vi.fn((_seed: string) => sample)
    const core = defineScheduler({ model: FSRS7Model, chrono: dateChrono })
      .use(
        probe,
        createSchedulerFuzzingMiddleware({ rng, fuzzingRange: [] }),
        schedulerLearningStepsMiddleware,
        override,
        schedulerMaximumIntervalMiddleware,
        schedulerMonotonicIntervalMiddleware
      )
      .create({
        config: {
          weights: FSRS7_DEFAULT_WEIGHTS,
          enableFuzz: true,
          enableShortTerm: true,
          learningSteps: [],
          relearningSteps: [],
          maximumInterval: 100,
        },
      })
    const card = core.newCard({ now, cardId: 'cache' })
    const step = vi.spyOn(core.model, 'step')
    const interval = vi.spyOn(core.model, 'nextInterval').mockReturnValue(10)
    const preview = core.preview({ card, now })
    const first = Array.from(preview)
    expect(
      first.map((item) => (item.card.dueAt.getTime() - now.getTime()) / DAY)
    ).toEqual([11, 12, 13, 14])
    expect(installations).toBe(3)
    expect(step).toHaveBeenCalledTimes(4)
    expect(interval).toHaveBeenCalledTimes(4)
    expect(visits).toHaveBeenCalledTimes(10)
    expect(rng).toHaveBeenCalledTimes(10)
    expect(sample).toHaveBeenCalledTimes(10)

    expect(Array.from(preview)).toEqual(first)
    expect(installations).toBe(3)
    expect(step).toHaveBeenCalledTimes(4)
    expect(interval).toHaveBeenCalledTimes(4)
    expect(visits).toHaveBeenCalledTimes(20)
    expect(sample).toHaveBeenCalledTimes(20)
    expect(candidates.size).toBe(1)

    const elapsedDays = 0
    const state = first[3].card
    step.mockClear()
    interval.mockClear()
    expect(
      core.nextInterval(state, 0.8, { card, grade: Rating.Easy, elapsedDays })
    ).toBe(14)
    expect(step.mock.calls.map(([input]) => input.rating)).toEqual([
      Rating.Again,
      Rating.Hard,
      Rating.Good,
    ])
    expect(interval).toHaveBeenCalledTimes(4)
    expect(
      visits.mock.calls.slice(-4).map(([, retention]) => retention)
    ).toEqual([0.8, 0.8, 0.8, 0.8])
    expect(installations).toBe(6)
    expect(candidates.size).toBe(2)
    expect(rng.mock.calls.every(([seed]) => seed === 'cache1')).toBe(true)
  })

  it('validates query inputs and the final interval without rejecting zero or fractions', async () => {
    const core = await DefaultScheduler({ enableShortTerm: false })
    const card = core.newCard({ now })
    const context = { card, grade: Rating.Again, elapsedDays: 0 }
    for (const invalid of [NaN, Infinity, -1, 0, 1]) {
      expect(() => core.nextInterval(card, invalid, context)).toThrow()
    }
    for (const elapsedDays of [NaN, Infinity, -1]) {
      expect(() =>
        core.nextInterval(
          card,
          0.9,
          Object.assign({}, context, { elapsedDays })
        )
      ).toThrow()
    }
    expect(() =>
      core.nextInterval(
        card,
        0.9,
        Object.assign({}, context, { grade: Rating.Manual as never })
      )
    ).toThrow()
    expect(() =>
      core.nextInterval(
        Object.assign({}, card, { stability: NaN }),
        0.9,
        context
      )
    ).toThrow()
    const interval = vi.spyOn(core.model, 'nextInterval')
    for (const value of [NaN, -1]) {
      interval.mockReturnValue(value)
      expect(() => core.nextInterval(card, 0.9, context)).toThrow()
    }
    for (const value of [0, 1 / 1440]) {
      interval.mockReturnValue(value)
      expect(core.nextInterval(card, 0.9, context)).toBe(value)
    }
  })
})
