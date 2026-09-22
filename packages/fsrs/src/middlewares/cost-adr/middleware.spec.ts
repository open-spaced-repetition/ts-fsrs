import {
  type AnySchedulerCore,
  type DesiredRetentionByGrade,
  defineMiddleware,
  defineScheduler,
  grades,
  Rating,
  type SchedulerConfigInputOf,
  State,
  schedulerStatsMiddleware,
} from '@open-spaced-repetition/srs-kit'
import { dateChrono } from '@open-spaced-repetition/srs-kit/chrono/date'
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { FSRS6_DEFAULT_WEIGHTS, FSRS6Model } from '@/models/fsrs-6/index.js'
import { FSRS7_DEFAULT_WEIGHTS, FSRS7Model } from '@/models/fsrs-7/index.js'
import { createSchedulerFuzzingMiddleware } from '../fuzzing/index.js'
import { schedulerLearningStepsMiddleware } from '../learning-steps/index.js'
import { schedulerMaximumIntervalMiddleware } from '../maximum-interval/index.js'
import { schedulerMonotonicIntervalMiddleware } from '../monotonic-interval/index.js'
import { schedulerScheduledDaysMiddleware } from '../scheduled-days/index.js'
import * as costAdrCore from './core.js'
import { evaluateCostAdrRetention } from './core.js'
import {
  COST_ADR_DEFAULT_GOAL_COST_WEIGHT,
  type CostAdrConfig,
  type CostAdrPolicy,
  COST_ADR_DEFAULT_POLICY as policy,
  schedulerCostAdrMiddleware,
} from './index.js'

const fsrs6Scheduler = defineScheduler({
  model: FSRS6Model,
  chrono: dateChrono,
})
const fsrs7Scheduler = defineScheduler({
  model: FSRS7Model,
  chrono: dateChrono,
})

const now = new Date('2026-01-10T00:00:00Z')
const state = { stability: 10, difficulty: 5, stabilityFast: 10 }
const config = {
  weights: FSRS7_DEFAULT_WEIGHTS,
  costAdrPolicy: policy,
  goalCostWeight: COST_ADR_DEFAULT_GOAL_COST_WEIGHT,
  fractionalDays: true,
} satisfies SchedulerConfigInputOf<typeof fsrs7Scheduler> & CostAdrConfig

afterEach(() => vi.restoreAllMocks())

describe('Cost ADR policy', () => {
  // Produced by compiling the evaluator extracted from that Rust revision.
  // JS uses f64; the reference implementation uses f32.
  it.each([
    [0.0001, 1, 0, 0.61252141],
    [0.01, 1, 64, 0.8736233711],
    [1, 5, 64, 0.9325417876],
    [10, 5, 64, 0.9510779381],
    [1000, 10, 64, 0.9755957723],
    [36500, 10, 1024, 0.9783571959],
    [0, -1, 0, 0.61252141],
    [1000000, 20, 2048, 0.9783571959],
  ])(
    'matches Rust for stability=%s difficulty=%s cost=%s',
    (stability, difficulty, weight, retention) => {
      expect(
        evaluateCostAdrRetention(policy, { stability, difficulty }, weight)
      ).toBeCloseTo(retention, 6)
    }
  )

  it('supports custom bounds and clamps cost weights at both ends', () => {
    const custom: CostAdrPolicy = {
      ...policy,
      costWeightMin: 4,
      costWeightMax: 128,
      retentionMin: 0.4,
      retentionMax: 0.95,
      bounds: { sMin: 0.1, sMax: 1000, dMin: 2, dMax: 8 },
    }
    expect(evaluateCostAdrRetention(custom, state, 32)).toBeCloseTo(
      0.9057754278,
      6
    )
    expect(evaluateCostAdrRetention(custom, state, 0)).toBe(
      evaluateCostAdrRetention(custom, state, 4)
    )
    expect(evaluateCostAdrRetention(custom, state, 2048)).toBe(
      evaluateCostAdrRetention(custom, state, 128)
    )
  })

  it('keeps retention finite for extreme logits and decreases it with cost', () => {
    for (const base of [-64, 0, 64]) {
      for (const effect of [-64, -20, 0, 20, 64]) {
        const coefficients = Array<number>(15).fill(0)
        coefficients[0] = base
        coefficients[5] = effect
        coefficients[10] = effect
        const extreme = { ...policy, coefficients }
        const low = evaluateCostAdrRetention(extreme, state, 0)
        const high = evaluateCostAdrRetention(extreme, state, 1024)
        expect(high).toBeGreaterThanOrEqual(policy.retentionMin)
        expect(low).toBeLessThanOrEqual(policy.retentionMax)
        expect(high).toBeLessThanOrEqual(low)
      }
    }
    expect(evaluateCostAdrRetention(policy, state, 0)).toBeGreaterThan(
      evaluateCostAdrRetention(policy, state, 1024)
    )
  })
})

describe('schedulerCostAdrMiddleware', () => {
  it.each(grades)('queries only grade %s and its predecessors', (grade) => {
    const core = fsrs7Scheduler
      .use(schedulerCostAdrMiddleware, schedulerMonotonicIntervalMiddleware)
      .create({ config })
    const card = core.newCard({ now })
    const evaluate = vi.spyOn(costAdrCore, 'evaluateCostAdrRetention')
    const step = vi.spyOn(core.model, 'step')
    const interval = vi.spyOn(core.model, 'nextInterval')
    const curve = vi.spyOn(core.model, 'forgettingCurve')

    core.nextInterval(state, 0.7, { card, grade, elapsedDays: 0.25 })

    expect(evaluate).toHaveBeenCalledTimes(grade)
    expect(step.mock.calls.map(([input]) => input.rating)).toEqual(
      grades.filter((rating) => rating < grade)
    )
    expect(interval).toHaveBeenCalledTimes(grade)
    expect(curve).toHaveBeenCalledTimes(grade === Rating.Again ? 0 : 1)
  })

  it('only extends the retention cache as a lazy preview is consumed', () => {
    const core = fsrs7Scheduler
      .use(schedulerCostAdrMiddleware, schedulerMonotonicIntervalMiddleware)
      .create({ config })
    const card = core.newCard({ now })
    const evaluate = vi.spyOn(costAdrCore, 'evaluateCostAdrRetention')
    const step = vi.spyOn(core.model, 'step')
    const interval = vi.spyOn(core.model, 'nextInterval')
    const preview = core.preview({ card, now })
    expect(evaluate).not.toHaveBeenCalled()
    expect(step).not.toHaveBeenCalled()
    expect(interval).not.toHaveBeenCalled()

    const iterator = preview[Symbol.iterator]()
    expect(iterator.next().value.grade).toBe(Rating.Again)
    expect(evaluate).toHaveBeenCalledTimes(1)
    expect(step.mock.calls.map(([input]) => input.rating)).toEqual([
      Rating.Again,
    ])
    expect(iterator.next().value.grade).toBe(Rating.Hard)
    expect(evaluate).toHaveBeenCalledTimes(2)
    expect(step.mock.calls.map(([input]) => input.rating)).toEqual([
      Rating.Again,
      Rating.Hard,
    ])

    expect(preview[Symbol.iterator]().next().value.grade).toBe(Rating.Again)
    expect(evaluate).toHaveBeenCalledTimes(2)
    const first = Array.from(preview)
    expect(Array.from(preview)).toEqual(first)
    expect(evaluate).toHaveBeenCalledTimes(4)
    expect(step).toHaveBeenCalledTimes(4)
    expect(interval).toHaveBeenCalledTimes(4)
  })

  it('rejects a candidate from a non-FSRS model before scheduling', () => {
    const next = vi.fn()
    const nextInterval = vi.fn(() => 1)
    expect(() =>
      schedulerCostAdrMiddleware.handlers!.nextInterval!(
        {
          config: { ...config, chrono: dateChrono },
          input: {
            card: { state: State.New, scheduleStatus: 'new' },
            grade: Rating.Good,
          },
          elapsedDays: 0,
          scheduledDays: undefined,
          candidate: {
            desiredRetention: {
              [Rating.Again]: 0.9,
              [Rating.Hard]: 0.9,
              [Rating.Good]: 0.9,
              [Rating.Easy]: 0.9,
            },

            step: () => ({ interval: 1, easeFactor: 2.5, reviewStep: 1 }),
            findGrade: () => Rating.Good,
            nextInterval,
          },
        },
        next
      )
    ).toThrow('Expected FSRS memory state')
    expect(next).not.toHaveBeenCalled()
    expect(nextInterval).not.toHaveBeenCalled()
  })

  it.each([
    [fsrs6Scheduler.use(schedulerCostAdrMiddleware), FSRS6_DEFAULT_WEIGHTS],
    [fsrs7Scheduler.use(schedulerCostAdrMiddleware), FSRS7_DEFAULT_WEIGHTS],
  ] as const)(
    'matches Rust constant-retention scenarios (%#)',
    (scheduler, weights) => {
      // cost_adr.rs: constant_retention(0.9) and
      // test_cost_adr_next_states_matches_constant_retention.
      const ratio = (0.9 - 0.3) / (0.995 - 0.3)
      const coefficients = Array<number>(15).fill(0)
      coefficients[0] = Math.log(ratio / (1 - ratio))
      coefficients[5] = -40
      coefficients[10] = -40
      const constantPolicy = { ...policy, coefficients }
      const core: AnySchedulerCore = scheduler.create({
        config: {
          ...config,
          costAdrPolicy: constantPolicy,
          weights,
          enableShortTerm: true,
          numRelearningSteps: 1,
        },
      })
      for (const memoryState of [
        null,
        { stability: 7, difficulty: 5, stabilityFast: 7 },
        { stability: 7, difficulty: 3, stabilityFast: 1.5 },
      ]) {
        for (const elapsedDays of [0.25, 7]) {
          const card = { ...core.newCard({ now }), ...memoryState }
          for (const grade of grades) {
            const nextState = core.model.step({
              memoryState: memoryState ?? card,
              rating: grade,
              elapsedDays,
            })
            const expected = core.model.nextInterval(nextState, 0.9)
            const interval = core.nextInterval(nextState, 0.9, {
              card,
              grade,
              elapsedDays,
            })
            expect(Math.abs(interval - expected)).toBeLessThan(1e-3)
            expect(
              Math.abs(
                evaluateCostAdrRetention(constantPolicy, nextState, 64) - 0.9
              )
            ).toBeLessThan(1e-4)
          }
        }
      }
    }
  )

  it.each([
    [fsrs6Scheduler.use(schedulerCostAdrMiddleware), FSRS6_DEFAULT_WEIGHTS],
    [fsrs7Scheduler.use(schedulerCostAdrMiddleware), FSRS7_DEFAULT_WEIGHTS],
  ] as const)(
    'uses post-rating state in review, preview, forward and queries (%#)',
    (scheduler, weights) => {
      const core: AnySchedulerCore = scheduler.create({
        config: {
          ...config,
          weights,
          enableShortTerm: true,
          numRelearningSteps: 1,
        },
      })
      const card = core.newCard({ now })
      for (const result of core.preview({ card, now })) {
        const retention = evaluateCostAdrRetention(
          policy,
          {
            stability: result.card.stability,
            difficulty: result.card.difficulty,
          },
          64
        )
        const expected = core.model.nextInterval(result.card, retention)
        expect(result.card.dueAt.getTime()).toBe(
          Math.trunc(now.getTime() + expected * 86400000)
        )
        expect(core.review({ card, grade: result.grade, now }).card).toEqual(
          result.card
        )
        expect(
          core.forward({
            initialCard: card,
            history: [{ rating: result.grade, reviewTime: now }],
          })[0].card
        ).toEqual(result.card)
        expect(
          core.nextInterval(result.card, 0.9, {
            card,
            grade: result.grade,
            elapsedDays: 0,
          })
        ).toBe(expected)
      }
    }
  )

  it('passes the supplied FSRS-7 state without stepping the current grade or reading time', () => {
    const core = fsrs7Scheduler
      .use(schedulerCostAdrMiddleware)
      .create({ config })
    expectTypeOf(core.config.goalCostWeight).toEqualTypeOf<number>()
    const card = core.newCard({ now })
    const expectedRetention = evaluateCostAdrRetention(policy, state, 64)
    const step = vi.spyOn(core.model, 'step')
    const interval = vi.spyOn(core.model, 'nextInterval')
    const curve = vi.spyOn(core.model, 'forgettingCurve')
    const clock = vi.spyOn(core.chrono, 'now')
    const result = core.nextInterval(state, 0.7, {
      card,
      grade: Rating.Good,
      elapsedDays: 0.25,
    })
    expect(result).toBeGreaterThan(0)
    expect(interval).toHaveBeenCalledExactlyOnceWith(state, expectedRetention)
    expect(step.mock.calls.map(([input]) => input.rating)).toEqual([
      Rating.Again,
      Rating.Hard,
    ])
    expect(curve).toHaveBeenCalledOnce()
    expect(clock).not.toHaveBeenCalled()
  })

  it('uses the effective per-rating retention after downstream overrides', () => {
    const core = fsrs7Scheduler
      .use(
        schedulerCostAdrMiddleware,
        defineMiddleware({
          name: 'retention-override',
          handlers: {
            nextInterval(ctx, next) {
              ctx.candidate.desiredRetention[ctx.input.grade] = 0.8
              next()
            },
          },
        })
      )
      .create({ config })
    const card = core.newCard({ now })
    expect(
      core.nextInterval(state, 0.9, {
        card,
        grade: Rating.Good,
        elapsedDays: 0,
      })
    ).toBe(core.model.nextInterval(state, 0.8))
  })

  it.each([
    [0, 0],
    [1 / 1440, 1 / 1440],
    [10, 3],
  ])(
    'applies only the upper cap to model interval %s',
    (modelInterval, expected) => {
      const core = fsrs7Scheduler
        .use(schedulerCostAdrMiddleware, schedulerMaximumIntervalMiddleware)
        .create({
          config: {
            ...config,
            maximumInterval: 3,
          },
        })
      const card = core.newCard({ now })
      vi.spyOn(core.model, 'nextInterval').mockReturnValue(modelInterval)
      expect(
        core.nextInterval(state, 0.9, {
          card,
          grade: Rating.Good,
          elapsedDays: 0,
        })
      ).toBe(expected)
    }
  )

  it('caps due times without changing the post-rating memory state', () => {
    const definition = fsrs7Scheduler.use(schedulerCostAdrMiddleware)
    const uncapped = definition.create({
      config,
    })
    const capped = definition.use(schedulerMaximumIntervalMiddleware).create({
      config: {
        ...config,
        maximumInterval: 3,
      },
    })
    const card = uncapped.newCard({ now })
    for (const grade of grades) {
      const original = uncapped.review({ card, grade, now })
      const limited = capped.review({ card, grade, now })
      expect(limited.card).toEqual({
        ...original.card,
        dueAt: new Date(
          Math.min(original.card.dueAt.getTime(), now.getTime() + 3 * 86400000)
        ),
      })
      expect(limited.revlog).toEqual(original.revlog)
    }
  })

  it('uses maximum-interval middleware for a reviewed FSRS-7 state', () => {
    const core = fsrs7Scheduler
      .use(schedulerCostAdrMiddleware, schedulerMaximumIntervalMiddleware)
      .create({
        config: {
          ...config,
          maximumInterval: 3,
        },
      })
    const card = {
      ...core.newCard({ now }),
      stability: 100,
      difficulty: 5,
      stabilityFast: 100,
    }
    const nextState = core.model.step({
      memoryState: card,
      rating: Rating.Good,
      elapsedDays: 7,
    })
    const interval = core.nextInterval(nextState, 0.9, {
      card,
      grade: Rating.Good,
      elapsedDays: 7,
    })
    expect(interval).toBeGreaterThanOrEqual(1)
    expect(interval).toBeLessThanOrEqual(3)
  })

  it('caps every grade after monotonic comparison in the documented order', () => {
    const core = fsrs7Scheduler
      .use(
        schedulerCostAdrMiddleware,
        schedulerMaximumIntervalMiddleware,
        schedulerMonotonicIntervalMiddleware
      )
      .create({
        config: {
          ...config,
          maximumInterval: 3,
        },
      })
    const before = new Date('2026-01-01T00:00:00Z')
    const card = {
      ...core.newCard({ now: before }),
      state: State.Review,
      scheduleStatus: 'review' as const,
      lastReviewAt: before,
      stability: 100,
      stabilityFast: 100,
      difficulty: 5,
    }
    const intervals = Array.from(
      core.preview({ card, now }),
      (result) => (result.card.dueAt.getTime() - now.getTime()) / 86400000
    )
    expect(intervals[0]).toBeGreaterThan(0)
    expect(intervals[0]).toBeLessThan(1)
    expect(intervals.slice(1)).toEqual([3, 3, 3])
  })

  it.each([undefined, NaN, Infinity, -1])(
    'rejects invalid interval %s after downstream middleware',
    (scheduledDays) => {
      const core = fsrs7Scheduler
        .use(
          schedulerCostAdrMiddleware,
          defineMiddleware({
            name: 'missing-interval',
            handlers: {
              nextInterval(ctx, next) {
                next()
                ctx.scheduledDays = scheduledDays
              },
            },
          })
        )
        .create({
          config: {
            ...config,
          },
        })
      const card = core.newCard({ now })
      expect(() =>
        core.nextInterval(state, 0.9, {
          card,
          grade: Rating.Good,
          elapsedDays: 0,
        })
      ).toThrow('scheduledDays')
    }
  )

  it('uses downstream per-rating retention for sibling comparisons', () => {
    const core = fsrs7Scheduler
      .use(
        schedulerCostAdrMiddleware,
        defineMiddleware({
          name: 'retention-override-with-siblings',
          handlers: {
            nextInterval(ctx, next) {
              ctx.candidate.desiredRetention[ctx.input.grade] = 0.8
              next()
            },
          },
        }),
        schedulerMonotonicIntervalMiddleware
      )
      .create({ config })
    const card = core.newCard({ now })
    const interval = vi.spyOn(core.model, 'nextInterval')
    core.nextInterval(state, 0.9, { card, grade: Rating.Good, elapsedDays: 0 })
    expect(interval).toHaveBeenCalledTimes(3)
    for (const [memoryState, retention] of interval.mock.calls) {
      expect(retention).toBe(
        memoryState.stability === state.stability
          ? 0.8
          : evaluateCostAdrRetention(policy, memoryState, 64)
      )
    }
  })

  it('shares one cached retention record across grades and repeated preview consumption', () => {
    const seen: DesiredRetentionByGrade[] = []
    const evaluate = vi.spyOn(costAdrCore, 'evaluateCostAdrRetention')
    const core = fsrs7Scheduler
      .use(
        defineMiddleware({
          name: 'observe-retention-map',
          handlers: {
            nextInterval(ctx, next) {
              const initialRetentions = ctx.candidate.desiredRetention
              next()
              expect(ctx.candidate.desiredRetention).toBe(initialRetentions)
              seen.push(ctx.candidate.desiredRetention)
            },
          },
        }),
        schedulerCostAdrMiddleware
      )
      .create({ config })
    const preview = core.preview({ card: core.newCard({ now }), now })
    const first = Array.from(preview)
    expect(Array.from(preview)).toEqual(first)
    expect(evaluate).toHaveBeenCalledTimes(4)
    expect(seen).toHaveLength(8)
    expect(Object.keys(seen[0])).toEqual(grades.map(String))
    expect(seen.every((retentions) => retentions === seen[0])).toBe(true)
  })

  it('compares each rating at its own retention while sharing the preview cache', () => {
    const evaluate = vi.spyOn(costAdrCore, 'evaluateCostAdrRetention')
    const coefficients = [32, 0, -64, 0, 0, -40, 0, 0, 0, 0, -40, 0, 0, 0, 0]
    const core = fsrs7Scheduler
      .use(schedulerCostAdrMiddleware, schedulerMonotonicIntervalMiddleware)
      .create({
        config: {
          ...config,
          costAdrPolicy: { ...policy, coefficients },
          maximumInterval: 36500,
        },
      })
    const card = core.newCard({ now })
    const step = vi.spyOn(core.model, 'step')
    const interval = vi.spyOn(core.model, 'nextInterval')
    const preview = core.preview({ card, now })
    const first = Array.from(preview)
    for (let index = 1; index < first.length; index++) {
      expect(first[index].card.dueAt.getTime()).toBeGreaterThanOrEqual(
        first[index - 1].card.dueAt.getTime()
      )
    }
    expect(Array.from(preview)).toEqual(first)
    expect(evaluate).toHaveBeenCalledTimes(4)
    expect(step).toHaveBeenCalledTimes(4)
    expect(interval).toHaveBeenCalledTimes(4)
    for (const result of first) {
      const query = core.nextInterval(result.card, 0.9, {
        card,
        grade: result.grade,
        elapsedDays: 0,
      })
      expect(Math.trunc(now.getTime() + query * 86400000)).toBe(
        result.card.dueAt.getTime()
      )
    }
  })

  it('preserves fractional elapsed days through two Good reviews and the third preview', () => {
    const core = fsrs7Scheduler
      .use(
        schedulerLearningStepsMiddleware,
        schedulerCostAdrMiddleware,
        schedulerMonotonicIntervalMiddleware
      )
      .create({
        config: {
          ...config,
          enableShortTerm: true,
          learningSteps: ['1m', '10m'],
          relearningSteps: ['10m'],
          maximumInterval: 36500,
        },
      })
    const first = core.review({
      card: core.newCard({ now }),
      now,
      grade: Rating.Good,
    }).card
    expect(first.dueAt.getTime() - now.getTime()).toBe(600000)

    const step = vi.spyOn(core.model, 'step')
    const second = core.review({
      card: first,
      now: first.dueAt,
      grade: Rating.Good,
    }).card
    expect(step).toHaveBeenCalled()
    for (const [input] of step.mock.calls) {
      expect(input.elapsedDays).toBe(10 / 1440)
    }
    expect(second.state).toBe(State.Review)
    expect(second.stabilityFast).toBeGreaterThan(first.stabilityFast)

    step.mockClear()
    const elapsedDays =
      (second.dueAt.getTime() - first.dueAt.getTime()) / 86400000
    expect(elapsedDays).toBeGreaterThan(0)
    expect(Number.isInteger(elapsedDays)).toBe(false)
    const preview = Array.from(
      core.preview({ card: second, now: second.dueAt })
    )
    expect(step).toHaveBeenCalledTimes(4)
    for (const [input] of step.mock.calls) {
      expect(input.elapsedDays).toBe(elapsedDays)
    }
    for (const result of preview) {
      expect(
        core.review({
          card: second,
          now: second.dueAt,
          grade: result.grade,
        }).card
      ).toEqual(result.card)
    }
  })

  it('keeps learning delays and existing candidate caches with fuzzing and monotonic intervals', () => {
    const rng = vi.fn(() => vi.fn(() => 0.5))
    const core = fsrs7Scheduler
      .use(
        createSchedulerFuzzingMiddleware({ rng }),
        schedulerStatsMiddleware,
        schedulerScheduledDaysMiddleware,
        schedulerLearningStepsMiddleware,
        schedulerCostAdrMiddleware,
        schedulerMaximumIntervalMiddleware,
        schedulerMonotonicIntervalMiddleware
      )
      .create({
        config: {
          ...config,
          enableFuzz: true,
          enableShortTerm: true,
          learningSteps: ['1m', '10m'],
          relearningSteps: ['10m'],
          maximumInterval: 2,
        },
      })
    const card = core.newCard({ now, cardId: 'cost-adr' })
    const step = vi.spyOn(core.model, 'step')
    const interval = vi.spyOn(core.model, 'nextInterval')
    const preview = core.preview({ card, now })
    const first = Array.from(preview)
    const calls = interval.mock.calls.length
    expect(
      first
        .slice(0, 3)
        .map((result) => result.card.dueAt.getTime() - now.getTime())
    ).toEqual([60000, 330000, 600000])
    expect(
      (first[3].card.dueAt.getTime() - now.getTime()) / 86400000
    ).toBeLessThanOrEqual(2)
    expect(Array.from(preview)).toEqual(first)
    expect(step).toHaveBeenCalledTimes(4)
    expect(interval).toHaveBeenCalledTimes(calls)
    for (const [index, grade] of grades.entries()) {
      const delay = core.nextInterval(first[index].card, 0.9, {
        card,
        grade,
        elapsedDays: 0,
      })
      expect(Math.trunc(now.getTime() + delay * 86400000)).toBe(
        first[index].card.dueAt.getTime()
      )
    }
  })
})
