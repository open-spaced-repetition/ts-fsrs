import {
  defineMiddleware,
  defineScheduler,
  Rating,
  schedulerStatsMiddleware,
} from '@open-spaced-repetition/srs-kit'
import { dateChrono } from '@open-spaced-repetition/srs-kit/chrono/date'
import { describe, expect, it } from 'vitest'
import { FSRS6_DEFAULT_WEIGHTS } from '@/models/fsrs-6/constants.js'
import { FSRS6Model } from '@/models/fsrs-6/model.js'
import { schedulerLearningStepsMiddleware } from '../learning-steps/middleware.js'
import { schedulerLeechMiddleware } from './middleware.js'
import { leechCardFieldsSchema } from './schema.js'

const now = new Date('2026-01-01T00:00:00.000Z')
const later = new Date('2026-01-10T00:00:00.000Z')
const modelConfig = {
  weights: [...FSRS6_DEFAULT_WEIGHTS],
  enableShortTerm: false,
  numRelearningSteps: 0,
}

function createLeechCore(leechThreshold = 8) {
  return defineScheduler({ model: FSRS6Model, chrono: dateChrono })
    .use(schedulerLeechMiddleware)
    .create({ config: { ...modelConfig, leechThreshold } })
}

function createReviewCard(core: ReturnType<typeof createLeechCore>) {
  return core.review({
    card: core.newCard({ now }),
    grade: Rating.Good,
    now,
  }).card
}

describe('schedulerLeechMiddleware review', () => {
  it('defaults new cards to zero lapses without stats middleware', () => {
    const scheduler = defineScheduler({
      model: FSRS6Model,
      chrono: dateChrono,
    }).use(schedulerLeechMiddleware)
    const core = scheduler.create({ config: modelConfig })

    expect(core.newCard({ now }).lapses).toBe(0)
    expect(core.config.leechThreshold).toBe(0)
    expect(scheduler.schema.scheduleStatus.parse('suspended')).toBe('suspended')
  })

  it.each([
    [7, 8],
    [15, 16],
  ] as const)('suspends a review card at lapse multiple %s -> %s', (before, after) => {
    const core = createLeechCore()
    const card = { ...createReviewCard(core), lapses: before }

    const result = core.review({ card, grade: Rating.Again, now: later })

    expect(result.card.lapses).toBe(after)
    expect(result.card.scheduleStatus).toBe('suspended')
  })

  it('does not suspend before the next threshold multiple', () => {
    const core = createLeechCore()
    const card = { ...createReviewCard(core), lapses: 8 }

    const result = core.review({ card, grade: Rating.Again, now: later })

    expect(result.card.lapses).toBe(9)
    expect(result.card.scheduleStatus).toBe('review')
  })

  it('disables suspension at threshold zero while still tracking lapses', () => {
    const core = createLeechCore(0)
    const card = { ...createReviewCard(core), lapses: 7 }

    const result = core.review({ card, grade: Rating.Again, now: later })

    expect(result.card.lapses).toBe(8)
    expect(result.card.scheduleStatus).toBe('review')
  })

  it('does not suspend when the current review is not a lapse', () => {
    const core = createLeechCore()
    const card = { ...createReviewCard(core), lapses: 8 }

    const result = core.review({ card, grade: Rating.Good, now: later })

    expect(result.card.lapses).toBe(8)
    expect(result.card.scheduleStatus).toBe('review')
  })

  it('does not count Again outside the Review state as a lapse', () => {
    const core = createLeechCore(1)

    const result = core.review({
      card: core.newCard({ now }),
      grade: Rating.Again,
      now,
    })

    expect(result.card.lapses).toBe(0)
    expect(result.card.scheduleStatus).toBe('review')
  })

  it('only suspends the Again preview at the next threshold', () => {
    const core = createLeechCore()
    const card = { ...createReviewCard(core), lapses: 7 }
    const preview = Array.from(core.preview({ card, now: later }))

    expect(preview.map(({ card }) => card.lapses)).toEqual([8, 7, 7, 7])
    expect(preview.map(({ card }) => card.scheduleStatus)).toEqual([
      'suspended',
      'review',
      'review',
      'review',
    ])
  })

  it('is independent of stats middleware registration order', () => {
    const config = { ...modelConfig, leechThreshold: 8 }
    const leechFirst = defineScheduler({
      model: FSRS6Model,
      chrono: dateChrono,
    })
      .use(schedulerLeechMiddleware, schedulerStatsMiddleware)
      .create({ config })
    const statsFirst = defineScheduler({
      model: FSRS6Model,
      chrono: dateChrono,
    })
      .use(schedulerStatsMiddleware, schedulerLeechMiddleware)
      .create({ config })
    const leechFirstCard = {
      ...leechFirst.review({
        card: leechFirst.newCard({ now }),
        grade: Rating.Good,
        now,
      }).card,
      lapses: 7,
    }
    const statsFirstCard = {
      ...statsFirst.review({
        card: statsFirst.newCard({ now }),
        grade: Rating.Good,
        now,
      }).card,
      lapses: 7,
    }

    const leechFirstResult = leechFirst.review({
      card: leechFirstCard,
      grade: Rating.Again,
      now: later,
    })
    const statsFirstResult = statsFirst.review({
      card: statsFirstCard,
      grade: Rating.Again,
      now: later,
    })

    expect({
      lapses: leechFirstResult.card.lapses,
      scheduleStatus: leechFirstResult.card.scheduleStatus,
    }).toEqual({ lapses: 8, scheduleStatus: 'suspended' })
    expect({
      lapses: statsFirstResult.card.lapses,
      scheduleStatus: statsFirstResult.card.scheduleStatus,
    }).toEqual({ lapses: 8, scheduleStatus: 'suspended' })
  })

  it('uses lapses already assigned by an earlier middleware', () => {
    const assignedLapsesMiddleware = defineMiddleware({
      name: 'test.assigned-lapses',
      schema: { card: leechCardFieldsSchema },
      handlers: {
        review(ctx, next) {
          ctx.result.card.lapses = 16
          next()
        },
      },
    })
    const core = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
      .use(assignedLapsesMiddleware, schedulerLeechMiddleware)
      .create({ config: { ...modelConfig, leechThreshold: 8 } })
    const card = {
      ...core.review({
        card: core.newCard({ now }),
        grade: Rating.Good,
        now,
      }).card,
      lapses: 7,
    }

    const result = core.review({ card, grade: Rating.Again, now: later })

    expect(result.card.lapses).toBe(16)
    expect(result.card.scheduleStatus).toBe('suspended')
  })

  it('overrides learning steps when registered before them', () => {
    const core = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
      .use(
        schedulerLeechMiddleware,
        schedulerLearningStepsMiddleware,
        schedulerStatsMiddleware
      )
      .create({
        config: {
          ...modelConfig,
          enableShortTerm: true,
          numRelearningSteps: 1,
          learningSteps: ['1m', '10m'],
          relearningSteps: ['10m'],
          leechThreshold: 1,
        },
      })
    const reviewed = core.review({
      card: core.newCard({ now }),
      grade: Rating.Easy,
      now,
    }).card

    const result = core.review({
      card: reviewed,
      grade: Rating.Again,
      now: later,
    })

    expect(result.card.lapses).toBe(1)
    expect(result.card.scheduleStatus).toBe('suspended')
  })
})

describe('schedulerLeechMiddleware lifecycle', () => {
  it('restores lapses and schedule status during rollback without stats', () => {
    const core = createLeechCore()
    const card = { ...createReviewCard(core), lapses: 7 }
    const reviewed = core.review({ card, grade: Rating.Again, now: later })

    const restored = core.rollback(reviewed)

    expect(restored.lapses).toBe(7)
    expect(restored.scheduleStatus).toBe('review')
  })

  it('keeps lapses when rolling back a non-lapse review', () => {
    const core = createLeechCore()
    const card = { ...createReviewCard(core), lapses: 7 }
    const reviewed = core.review({ card, grade: Rating.Good, now: later })

    expect(core.rollback(reviewed).lapses).toBe(7)
  })

  it('clears lapses on forget by default', () => {
    const core = createLeechCore()
    const card = { ...createReviewCard(core), lapses: 7 }

    expect(core.forget({ card, now: later }).lapses).toBe(0)
  })

  it('preserves lapses with stats regardless of registration order', () => {
    const config = {
      ...modelConfig,
      leechThreshold: 8,
      clearStatsOnForget: false,
    }
    const leechFirst = defineScheduler({
      model: FSRS6Model,
      chrono: dateChrono,
    })
      .use(schedulerLeechMiddleware, schedulerStatsMiddleware)
      .create({ config })
    const statsFirst = defineScheduler({
      model: FSRS6Model,
      chrono: dateChrono,
    })
      .use(schedulerStatsMiddleware, schedulerLeechMiddleware)
      .create({ config })
    const leechFirstCard = { ...leechFirst.newCard({ now }), lapses: 7 }
    const statsFirstCard = { ...statsFirst.newCard({ now }), lapses: 7 }

    expect(leechFirst.forget({ card: leechFirstCard, now: later }).lapses).toBe(
      7
    )
    expect(statsFirst.forget({ card: statsFirstCard, now: later }).lapses).toBe(
      7
    )
  })
})
