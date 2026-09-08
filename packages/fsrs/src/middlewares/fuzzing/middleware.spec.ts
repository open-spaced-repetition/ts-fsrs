import {
  defineMiddleware,
  defineScheduler,
  Rating,
  State,
  schedulerStatsMiddleware,
} from '@open-spaced-repetition/srs-kit'
import { dateChrono } from '@open-spaced-repetition/srs-kit/chrono/date'
import { describe, expect, it, vi } from 'vitest'
import { FSRS6_DEFAULT_WEIGHTS } from '@/models/fsrs-6/constants.js'
import { FSRS6Model } from '@/models/fsrs-6/model.js'
import { schedulerLearningStepsMiddleware } from '../learning-steps/middleware.js'
import type { StepUnit } from '../learning-steps/types.js'
import { schedulerScheduledDaysMiddleware } from '../scheduled-days/middleware.js'
import { withFuzzing } from './core.js'
import {
  createSchedulerFuzzingMiddleware,
  schedulerFuzzingMiddleware,
} from './middleware.js'
import { fuzzingCardFieldsSchema } from './schema.js'

const DAY = 86_400_000
const now = new Date('2026-01-01T00:00:00.000Z')
const later = new Date('2026-01-10T00:00:00.000Z')
const config = {
  weights: [...FSRS6_DEFAULT_WEIGHTS],
  enableShortTerm: false,
  numRelearningSteps: 0,
  enableFuzz: true,
  maximumInterval: 36_500,
}

describe('fuzzing with explicit learning steps', () => {
  const schedulerDefinition = defineScheduler({
    model: FSRS6Model,
    chrono: dateChrono,
  }).use(
    schedulerFuzzingMiddleware,
    schedulerScheduledDaysMiddleware,
    schedulerLearningStepsMiddleware
  )
  function createCore(fractionalDays: boolean, step: StepUnit) {
    const core = schedulerDefinition.create({
      config: {
        weights: FSRS6_DEFAULT_WEIGHTS,
        numRelearningSteps: 0,
        enableFuzz: true,
        maximumInterval: 36500,
        fractionalDays,
        enableShortTerm: true,
        learningSteps: [step],
        relearningSteps: [],
      },
    })
    vi.spyOn(core.model, 'nextInterval').mockReturnValue(0.25)
    return core
  }

  it.each([
    false,
    true,
  ])('preserves a positive step at learningStep=0 with fractionalDays=%s', (fractionalDays) => {
    for (const [step, minutes] of [
      ['0.01m', 1 / 60],
      ['10m', 10],
      ['1d', 1440],
      ['2.4d', 3456],
    ] as const) {
      const core = createCore(fractionalDays, step)
      expect(
        core.chrono.difference(now, new Date(now.getTime() + DAY / 2))
      ).toBe(fractionalDays ? 0.5 : 0)
      const card = core.newCard({ now })
      expect(card.learningStep).toBe(0)
      const result = core.review({ card, now, grade: Rating.Again })
      expect(result.card.dueAt.getTime() - now.getTime()).toBe(minutes * 60000)
      expect(result.card.scheduledDays).toBe(
        fractionalDays ? minutes / 1440 : Math.floor(minutes / 1440)
      )
      expect(result.card.learningStep).toBe(0)
      expect(result.card.state).toBe(
        minutes < 1440 ? State.Learning : State.Review
      )
      expect(core.rollback(result)).toEqual(card)
    }
  })

  it.each([
    false,
    true,
  ])('uses the configured rounding for zero steps and graduation with fractionalDays=%s', (fractionalDays) => {
    for (const step of ['0m', '0.001m', '1m'] as const) {
      const core = createCore(fractionalDays, step)
      const card = core.newCard({ now })
      const first = core.review({ card, now, grade: Rating.Again })
      const result =
        step === '1m'
          ? core.review({ card: first.card, now, grade: Rating.Good })
          : first
      const interval = core.model.nextInterval(result.card, 0.9)
      expect(interval).toBeGreaterThan(0)
      expect(interval).toBeLessThan(0.5)
      expect(result.card.dueAt.getTime() - now.getTime()).toBe(
        fractionalDays ? Math.trunc(interval * DAY) : 0
      )
      expect(result.card.scheduledDays).toBe(fractionalDays ? interval : 0)
      expect(result.card.state).toBe(State.Review)
      expect(result.card.learningStep).toBe(0)
    }
  })
})

it.each([
  undefined,
  false,
  true,
])('shares fractionalDays config between fuzzing and scheduled days (%s)', (fractionalDays) => {
  const scheduler = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
    .use(schedulerFuzzingMiddleware, schedulerScheduledDaysMiddleware)
    .create({
      config: {
        weights: FSRS6_DEFAULT_WEIGHTS,
        enableShortTerm: false,
        numRelearningSteps: 0,
        enableFuzz: true,
        maximumInterval: 36500,
        fractionalDays,
      },
    })
  vi.spyOn(scheduler.model, 'nextInterval').mockReturnValue(0.25)
  const card = scheduler.newCard({ now, cardId: 'fractional' })
  const result = scheduler.review({ card, now, grade: Rating.Again })
  const interval = scheduler.model.nextInterval(result.card, 0.9)
  expect(withFuzzing(interval, 0, scheduler.config, 'fractional1')).toBe(
    fractionalDays ? interval : 0
  )
  expect(scheduler.config.fractionalDays).toBe(fractionalDays ?? false)
  expect(result.card.scheduledDays).toBe(fractionalDays ? interval : 0)
  expect(result.card.dueAt.getTime() - now.getTime()).toBe(
    fractionalDays ? Math.trunc(interval * DAY) : 0
  )
  expect(scheduler.rollback(result)).toEqual(card)
})

const fuzzFirstCore = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
  .use(schedulerFuzzingMiddleware, schedulerStatsMiddleware)
  .create({ config })

const statsFirstCore = defineScheduler({
  model: FSRS6Model,
  chrono: dateChrono,
})
  .use(schedulerStatsMiddleware, schedulerFuzzingMiddleware)
  .create({ config })

const fuzzFirstPreserveCore = defineScheduler({
  model: FSRS6Model,
  chrono: dateChrono,
})
  .use(schedulerFuzzingMiddleware, schedulerStatsMiddleware)
  .create({ config: { ...config, clearStatsOnForget: false } })

const statsFirstPreserveCore = defineScheduler({
  model: FSRS6Model,
  chrono: dateChrono,
})
  .use(schedulerStatsMiddleware, schedulerFuzzingMiddleware)
  .create({ config: { ...config, clearStatsOnForget: false } })

const plainCore = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
  .use(schedulerStatsMiddleware)
  .create({ config })

function scheduledDays(dueAt: Date, reviewedAt: Date): number {
  return (dueAt.getTime() - reviewedAt.getTime()) / DAY
}

describe('schedulerFuzzingMiddleware defaults', () => {
  it('injects an explicit cardId into a new card', () => {
    const card = fuzzFirstCore.newCard({
      now,
      cardId: 'explicit-card',
    })

    expect(card.cardId).toBe('explicit-card')
  })

  it('generates distinct UUID card IDs by default', () => {
    const first = fuzzFirstCore.newCard({ now })
    const second = fuzzFirstCore.newCard({ now })

    expect(first.cardId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
    expect(second.cardId).not.toBe(first.cardId)
  })

  it('validates an explicitly injected cardId', () => {
    expect(() => fuzzFirstCore.newCard({ now, cardId: '' as never })).toThrow(
      'Expected new card cardId'
    )
  })
})

describe('schedulerFuzzingMiddleware review', () => {
  it('uses cardId plus the incremented review reps and keeps dueAt aligned', () => {
    const cardId = 'card-'
    const card = fuzzFirstCore.newCard({ now, cardId })
    const plainCard = plainCore.newCard({ now })
    const base = plainCore.review({
      card: plainCard,
      grade: Rating.Easy,
      now,
    })
    const baseInterval = scheduledDays(base.card.dueAt, now)
    const expectedInterval = withFuzzing(baseInterval, 0, config, `${cardId}1`)

    const first = fuzzFirstCore.review({
      card,
      grade: Rating.Easy,
      now,
    })
    const second = fuzzFirstCore.review({
      card,
      grade: Rating.Easy,
      now,
    })

    expect(scheduledDays(first.card.dueAt, now)).toBe(expectedInterval)
    expect(second.card.dueAt).toEqual(first.card.dueAt)
    expect(first.card.reps).toBe(1)
    expect(first.card.cardId).toBe(cardId)
    expect(first.revlog.cardId).toBe(cardId)
  })

  it('uses middleware factory range and rng options', () => {
    const cardId = 'string-card'
    const rng = vi.fn((_seed: string) => () => 0.5)
    const core = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
      .use(
        createSchedulerFuzzingMiddleware({ fuzzingRange: [], rng }),
        schedulerStatsMiddleware
      )
      .create({ config })
    const card = core.newCard({ now, cardId })
    const plainCard = plainCore.newCard({ now })
    const base = plainCore.review({ card: plainCard, grade: Rating.Easy, now })

    const result = core.review({ card, grade: Rating.Easy, now })

    expect(result.card.dueAt).toEqual(base.card.dueAt)
    expect(core.config).not.toHaveProperty('fuzzingRange')
    expect(core.config).not.toHaveProperty('rng')
    expect(rng).toHaveBeenCalledWith(`${cardId}1`)
  })

  it('is independent of the stats middleware registration order', () => {
    const cardId = 'stable-order'
    const fuzzFirstCard = fuzzFirstCore.newCard({ now, cardId })
    const statsFirstCard = statsFirstCore.newCard({ now, cardId })

    const fuzzFirst = fuzzFirstCore.review({
      card: fuzzFirstCard,
      grade: Rating.Easy,
      now,
    })
    const statsFirst = statsFirstCore.review({
      card: statsFirstCard,
      grade: Rating.Easy,
      now,
    })

    expect(statsFirst.card.dueAt).toEqual(fuzzFirst.card.dueAt)
    expect(statsFirst.card.reps).toBe(fuzzFirst.card.reps)
  })

  it('uses reps already assigned by an earlier middleware', () => {
    const cardId = 'assigned-reps'
    const rng = vi.fn((_seed: string) => () => 0.5)
    const assignedRepsMiddleware = defineMiddleware({
      name: 'test.assigned-reps',
      schema: { card: fuzzingCardFieldsSchema },
      handlers: {
        review(ctx, next) {
          ctx.result.card.reps = 7
          next()
        },
      },
    })
    const core = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
      .use(assignedRepsMiddleware, createSchedulerFuzzingMiddleware({ rng }))
      .create({ config })
    const card = core.newCard({ now, cardId })

    const result = core.review({ card, grade: Rating.Easy, now })

    expect(result.card.reps).toBe(7)
    expect(rng).toHaveBeenCalledWith(`${cardId}7`)
  })

  it('rounds a short model interval without creating a fuzz factor', () => {
    const card = fuzzFirstCore.newCard({
      now,
      cardId: 'short-model-interval',
    })
    const plainCard = plainCore.newCard({ now })
    const expected = plainCore.review({
      card: plainCard,
      grade: Rating.Again,
      now,
    })

    const result = fuzzFirstCore.review({
      card,
      grade: Rating.Again,
      now,
    })

    expect(result.card.dueAt).toEqual(expected.card.dueAt)
  })

  it('derives stable intervals without caching the fuzz factor', () => {
    const rng = vi.fn((_seed: string) => () => 0.5)
    const core = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
      .use(createSchedulerFuzzingMiddleware({ rng }))
      .create({ config })
    const plainCard = plainCore.newCard({ now })
    const rawIntervals = Array.from(
      plainCore.preview({ card: plainCard, now }),
      (item) => scheduledDays(item.card.dueAt, now)
    )
    const card = fuzzFirstCore.newCard({
      now,
      cardId: 'preview-card',
    })

    const first = Array.from(core.preview({ card, now }))
    const firstCallCount = rng.mock.calls.length
    const second = Array.from(core.preview({ card, now }))

    expect(first).toHaveLength(4)
    expect(second.map((item) => item.card.dueAt)).toEqual(
      first.map((item) => item.card.dueAt)
    )
    expect(firstCallCount).toBe(
      rawIntervals.filter((interval) => interval >= 2.5).length
    )
    expect(rng).toHaveBeenCalledTimes(firstCallCount * 2)
    expect(rng.mock.calls.every(([seed]) => seed === 'preview-card1')).toBe(
      true
    )
  })

  it('uses the model interval instead of an earlier scheduledDays value', () => {
    const fixedIntervalMiddleware = defineMiddleware({
      name: 'test.fixed-interval',
      handlers: {
        review(ctx, next) {
          ctx.scheduledDays = 1
          next()
        },
      },
    })
    const core = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
      .use(
        fixedIntervalMiddleware,
        createSchedulerFuzzingMiddleware({
          fuzzingRange: [],
          rng: () => () => 0,
        }),
        schedulerStatsMiddleware
      )
      .create({ config })
    const card = core.newCard({ now, cardId: 'short-term' })

    const result = core.review({ card, grade: Rating.Easy, now })

    expect(scheduledDays(result.card.dueAt, now)).toBeGreaterThan(1)
  })

  it('tracks reps without requiring the stats middleware', () => {
    const enabledCore = defineScheduler({
      model: FSRS6Model,
      chrono: dateChrono,
    })
      .use(schedulerFuzzingMiddleware)
      .create({ config })
    const enabledCard = enabledCore.newCard({
      now,
      cardId: 'missing-reps',
    })

    const enabledResult = enabledCore.review({
      card: enabledCard,
      grade: Rating.Easy,
      now,
    })
    expect(enabledResult.card.reps).toBe(1)

    const disabledCore = defineScheduler({
      model: FSRS6Model,
      chrono: dateChrono,
    })
      .use(schedulerFuzzingMiddleware)
      .create({ config: { ...config, enableFuzz: false } })
    const disabledCard = disabledCore.newCard({
      now,
      cardId: 'disabled',
    })

    const disabledResult = disabledCore.review({
      card: disabledCard,
      grade: Rating.Easy,
      now,
    })
    expect(disabledResult.card.reps).toBe(1)
  })

  it('returns before creating a fuzz factor when fuzzing is disabled', () => {
    const rng = vi.fn((_seed: string) => () => 0.5)
    const core = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
      .use(createSchedulerFuzzingMiddleware({ rng }))
      .create({ config: { ...config, enableFuzz: false } })
    const card = core.newCard({ now, cardId: 'disabled-fast-path' })

    core.review({ card, grade: Rating.Easy, now })

    expect(rng).not.toHaveBeenCalled()
  })
})

describe('schedulerFuzzingMiddleware lifecycle', () => {
  it('preserves cardId through forget and rollback', () => {
    const cardId = 'lifecycle-card'
    const card = fuzzFirstCore.newCard({ now, cardId })
    const reviewed = fuzzFirstCore.review({
      card,
      grade: Rating.Easy,
      now,
    })

    const forgotten = fuzzFirstCore.forget({ card: reviewed.card, now: later })
    const restored = fuzzFirstCore.rollback({
      card: reviewed.card,
      revlog: reviewed.revlog,
    })

    expect(forgotten.cardId).toBe(cardId)
    expect(restored.cardId).toBe(cardId)
  })

  it('clears stats independently of middleware registration order', () => {
    const fuzzFirstCard = {
      ...fuzzFirstCore.newCard({ now, cardId: 'fuzz-first-clear' }),
      reps: 3,
      lapses: 1,
    }
    const statsFirstCard = {
      ...statsFirstCore.newCard({ now, cardId: 'stats-first-clear' }),
      reps: 3,
      lapses: 1,
    }

    const fuzzFirst = fuzzFirstCore.forget({ card: fuzzFirstCard, now: later })
    const statsFirst = statsFirstCore.forget({
      card: statsFirstCard,
      now: later,
    })

    expect({ reps: fuzzFirst.reps, lapses: fuzzFirst.lapses }).toEqual({
      reps: 0,
      lapses: 0,
    })
    expect({ reps: statsFirst.reps, lapses: statsFirst.lapses }).toEqual({
      reps: 0,
      lapses: 0,
    })
  })

  it('preserves stats independently of middleware registration order', () => {
    const fuzzFirstCard = {
      ...fuzzFirstPreserveCore.newCard({
        now,
        cardId: 'fuzz-first-preserve',
      }),
      reps: 3,
      lapses: 1,
    }
    const statsFirstCard = {
      ...statsFirstPreserveCore.newCard({
        now,
        cardId: 'stats-first-preserve',
      }),
      reps: 3,
      lapses: 1,
    }

    const fuzzFirst = fuzzFirstPreserveCore.forget({
      card: fuzzFirstCard,
      now: later,
    })
    const statsFirst = statsFirstPreserveCore.forget({
      card: statsFirstCard,
      now: later,
    })

    expect({ reps: fuzzFirst.reps, lapses: fuzzFirst.lapses }).toEqual({
      reps: 3,
      lapses: 1,
    })
    expect({ reps: statsFirst.reps, lapses: statsFirst.lapses }).toEqual({
      reps: 3,
      lapses: 1,
    })
  })

  it('rejects review cards without cardId', () => {
    const card = fuzzFirstCore.newCard({ now })
    const { cardId: _, ...withoutCardId } = card

    expect(() =>
      fuzzFirstCore.review({
        card: withoutCardId as typeof card,
        grade: Rating.Good,
        now,
      })
    ).toThrow('Expected card cardId')
  })
})
