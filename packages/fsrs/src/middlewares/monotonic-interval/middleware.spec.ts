import {
  defineScheduler,
  type Grade,
  grades,
  Rating,
  State,
} from '@open-spaced-repetition/srs-kit'
import { dateChrono } from '@open-spaced-repetition/srs-kit/chrono/date'
import { describe, expect, it, vi } from 'vitest'
import { FSRS6_DEFAULT_WEIGHTS } from '@/models/fsrs-6/constants.js'
import { FSRS6Model } from '@/models/fsrs-6/model.js'
import { createSchedulerFuzzingMiddleware } from '../fuzzing/middleware.js'
import { schedulerLearningStepsMiddleware } from '../learning-steps/middleware.js'
import { calculateScheduleDays } from './core.js'
import { schedulerMonotonicIntervalMiddleware } from './middleware.js'

const DAY = 86_400_000
const now = new Date('2026-01-01T00:00:00.000Z')
const later = new Date('2026-01-10T00:00:00.000Z')
const maximumInterval = 100
const reviewHandler = schedulerMonotonicIntervalMiddleware.handlers?.review

if (!reviewHandler)
  throw new Error('Expected monotonic interval review handler')

type ReviewContext = Parameters<typeof reviewHandler>[0]

function createReviewContext({
  grade,
  intervals,
  state = State.Review,
  maximum = maximumInterval,
  scheduledDays,
}: {
  readonly grade: Grade
  readonly intervals: Readonly<Record<Grade, number>>
  readonly state?: State
  readonly maximum?: number
  readonly scheduledDays?: number
}) {
  const step = vi.fn((rating: Grade) => ({ rating }))
  const nextInterval = vi.fn(
    (
      memoryState: Readonly<Record<string, unknown>>,
      _desiredRetention: number
    ) => intervals[memoryState.rating as Grade]
  )
  const ctx = {
    config: { maximumInterval: maximum },
    input: {
      card: { state, scheduleStatus: 'review' },
      grade,
      now,
    },
    desiredRetention: 0.9,
    elapsedDays: 9,
    scheduledDays,
    candidate: { step, nextInterval },
    result: { card: {}, revlog: {} },
  } as unknown as ReviewContext
  const next = vi.fn(() => {
    ctx.scheduledDays ??= intervals[grade]
  })

  return { ctx, next, nextInterval, step }
}

function dueDays(dueAt: Date, reviewTime: Date): number {
  return (dueAt.getTime() - reviewTime.getTime()) / DAY
}

describe('schedulerMonotonicIntervalMiddleware handler', () => {
  const longTermIntervals = {
    [Rating.Again]: 2,
    [Rating.Hard]: 4,
    [Rating.Good]: 3,
    [Rating.Easy]: 7,
  }

  it.each([
    [Rating.Again, 2, []],
    [Rating.Hard, 4, [Rating.Again]],
    [Rating.Good, 5, [Rating.Again, Rating.Hard]],
    [Rating.Easy, 7, [Rating.Again, Rating.Hard, Rating.Good]],
  ] as const)('uses the required long-term candidates for grade %s', (grade, expected, expectedGrades) => {
    const { ctx, next, nextInterval, step } = createReviewContext({
      grade,
      intervals: longTermIntervals,
    })

    reviewHandler(ctx, next)

    expect(ctx.scheduledDays).toBe(expected)
    expect(step.mock.calls.map(([rating]) => rating)).toEqual(expectedGrades)
    expect(nextInterval).toHaveBeenCalledTimes(expectedGrades.length)
    expect(
      nextInterval.mock.calls.every(([, retention]) => retention === 0.9)
    ).toBe(true)
    expect(next).toHaveBeenCalledOnce()
  })

  it('normalizes an interval selected by an earlier middleware', () => {
    const { ctx, next, step } = createReviewContext({
      grade: Rating.Good,
      intervals: longTermIntervals,
      scheduledDays: 2,
    })

    reviewHandler(ctx, next)

    expect(ctx.scheduledDays).toBe(5)
    expect(step.mock.calls.map(([rating]) => rating)).toEqual([
      Rating.Again,
      Rating.Hard,
    ])
    expect(next).toHaveBeenCalledOnce()
  })

  it.each([
    State.New,
    State.Learning,
    State.Review,
    State.Relearning,
  ])('uses the full rating chain for card state %s', (state) => {
    const { ctx, next, step } = createReviewContext({
      grade: Rating.Easy,
      intervals: longTermIntervals,
      state,
    })

    reviewHandler(ctx, next)

    expect(ctx.scheduledDays).toBe(7)
    expect(step.mock.calls.map(([rating]) => rating)).toEqual([
      Rating.Again,
      Rating.Hard,
      Rating.Good,
    ])
    expect(next).toHaveBeenCalledOnce()
  })

  it('allows later ratings to share the maximum interval', () => {
    const { ctx, next } = createReviewContext({
      grade: Rating.Easy,
      maximum: 100,
      intervals: {
        [Rating.Again]: 98,
        [Rating.Hard]: 99,
        [Rating.Good]: 100,
        [Rating.Easy]: 101,
      },
    })

    reviewHandler(ctx, next)

    expect(ctx.scheduledDays).toBe(100)
  })
})

describe('schedulerMonotonicIntervalMiddleware integration', () => {
  it('uses the default maximum interval when it is omitted', () => {
    const core = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
      .use(schedulerMonotonicIntervalMiddleware)
      .create({
        config: {
          weights: [...FSRS6_DEFAULT_WEIGHTS],
          enableShortTerm: false,
          numRelearningSteps: 0,
        },
      })

    expect(core.config.maximumInterval).toBe(36_500)
  })

  it('keeps long-term review and preview due dates aligned', () => {
    const modelConfig = {
      weights: [...FSRS6_DEFAULT_WEIGHTS],
      enableShortTerm: false,
      numRelearningSteps: 0,
    }
    const base = defineScheduler({
      model: FSRS6Model,
      chrono: dateChrono,
    }).create({ config: modelConfig })
    const core = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
      .use(schedulerMonotonicIntervalMiddleware)
      .create({ config: { ...modelConfig, maximumInterval } })
    const baseCard = base.newCard({ now })
    const card = core.newCard({ now })
    const raw = Array.from(base.preview({ card: baseCard, now }), (item) =>
      dueDays(item.card.dueAt, now)
    )
    const expected = calculateScheduleDays(
      [raw[0], raw[1], raw[2], raw[3]],
      maximumInterval
    )
    const preview = Array.from(core.preview({ card, now }))

    expect(preview.map((item) => dueDays(item.card.dueAt, now))).toEqual(
      expected
    )
    for (const [index, grade] of grades.entries()) {
      expect(dueDays(core.review({ card, grade, now }).card.dueAt, now)).toBe(
        expected[index]
      )
    }
  })

  it('uses the full rating chain when short-term scheduling is enabled', () => {
    const modelConfig = {
      weights: [...FSRS6_DEFAULT_WEIGHTS],
      enableShortTerm: true,
      numRelearningSteps: 1,
    }
    const base = defineScheduler({
      model: FSRS6Model,
      chrono: dateChrono,
    }).create({ config: modelConfig })
    const core = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
      .use(schedulerMonotonicIntervalMiddleware)
      .create({ config: { ...modelConfig, maximumInterval } })
    const baseCard = base.review({
      card: base.newCard({ now }),
      grade: Rating.Easy,
      now,
    }).card
    const card = core.review({
      card: core.newCard({ now }),
      grade: Rating.Easy,
      now,
    }).card
    const raw = Array.from(
      base.preview({ card: baseCard, now: later }),
      (item) => dueDays(item.card.dueAt, later)
    )
    const expected = calculateScheduleDays(
      [raw[0], raw[1], raw[2], raw[3]],
      maximumInterval
    )
    const preview = Array.from(core.preview({ card, now: later }))

    expect(preview.map((item) => dueDays(item.card.dueAt, later))).toEqual(
      expected
    )
    for (const [index, grade] of grades.entries()) {
      expect(
        dueDays(core.review({ card, grade, now: later }).card.dueAt, later)
      ).toBe(expected[index])
    }
  })

  it('uses fuzzing output when fuzzing is registered before monotonic', () => {
    const modelConfig = {
      weights: [...FSRS6_DEFAULT_WEIGHTS],
      enableShortTerm: false,
      numRelearningSteps: 0,
    }
    const config = {
      ...modelConfig,
      enableFuzz: true,
      maximumInterval,
    }
    const fuzzOnlyRng = vi.fn((_seed: string) => () => 0)
    const combinedRng = vi.fn((_seed: string) => () => 0)
    const fuzzOnly = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
      .use(
        createSchedulerFuzzingMiddleware({
          rng: fuzzOnlyRng,
        })
      )
      .create({ config })
    const core = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
      .use(
        createSchedulerFuzzingMiddleware({
          rng: combinedRng,
        }),
        schedulerMonotonicIntervalMiddleware
      )
      .create({ config })
    const cardId = 'monotonic-fuzz'
    const fuzzOnlyCard = fuzzOnly.newCard({ now, cardId })
    const card = core.newCard({ now, cardId })
    const fuzzed = Array.from(
      fuzzOnly.preview({ card: fuzzOnlyCard, now }),
      (item) => dueDays(item.card.dueAt, now)
    )
    const expected = calculateScheduleDays(
      [fuzzed[0], fuzzed[1], fuzzed[2], fuzzed[3]],
      maximumInterval
    )
    const preview = Array.from(core.preview({ card, now }))
    const direct = core.review({ card, grade: Rating.Easy, now })

    expect(preview.map((item) => dueDays(item.card.dueAt, now))).toEqual(
      expected
    )
    expect(dueDays(direct.card.dueAt, now)).toBe(expected[3])
    expect(fuzzOnlyRng).toHaveBeenCalled()
    expect(combinedRng).toHaveBeenCalled()
  })

  it('lets learning steps own short-term and graduation intervals', () => {
    const core = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
      .use(
        createSchedulerFuzzingMiddleware({ rng: () => () => 0.5 }),
        schedulerLearningStepsMiddleware,
        schedulerMonotonicIntervalMiddleware
      )
      .create({
        config: {
          weights: [...FSRS6_DEFAULT_WEIGHTS],
          enableShortTerm: true,
          numRelearningSteps: 1,
          enableFuzz: true,
          maximumInterval,
          learningSteps: ['1m', '10m'],
          relearningSteps: ['10m'],
        },
      })
    const card = core.newCard({ now, cardId: 'learning-step' })
    const preview = new Map(
      Array.from(core.preview({ card, now }), (item) => [item.grade, item])
    )

    expect(
      preview.get(Rating.Again)!.card.dueAt.getTime() - now.getTime()
    ).toBe(60_000)
    expect(preview.get(Rating.Hard)!.card.dueAt.getTime() - now.getTime()).toBe(
      6 * 60_000
    )
    expect(preview.get(Rating.Good)!.card.dueAt.getTime() - now.getTime()).toBe(
      10 * 60_000
    )
    expect(preview.get(Rating.Easy)!.card.state).toBe(State.Review)

    const learningCard = preview.get(Rating.Good)!.card
    const learningGraduation = core.review({
      card: learningCard,
      grade: Rating.Good,
      now: learningCard.dueAt,
    })
    expect(learningGraduation.card.state).toBe(State.Review)
    expect(dueDays(learningGraduation.card.dueAt, learningCard.dueAt)).toBe(2)

    const reviewCard = preview.get(Rating.Easy)!.card
    const relearningCard = core.review({
      card: reviewCard,
      grade: Rating.Again,
      now: reviewCard.dueAt,
    }).card
    expect(relearningCard.state).toBe(State.Relearning)

    const relearningGraduation = core.review({
      card: relearningCard,
      grade: Rating.Good,
      now: relearningCard.dueAt,
    })
    expect(relearningGraduation.card.state).toBe(State.Review)
    expect(dueDays(relearningGraduation.card.dueAt, relearningCard.dueAt)).toBe(
      1
    )
  })
})
