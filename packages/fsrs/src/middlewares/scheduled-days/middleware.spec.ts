import {
  defineMiddleware,
  defineScheduler,
  Rating,
  State,
} from '@open-spaced-repetition/srs-kit'
import { dateChrono } from '@open-spaced-repetition/srs-kit/chrono/date'
import { describe, expect, it } from 'vitest'
import { FSRS6_DEFAULT_WEIGHTS } from '@/models/fsrs-6/constants.js'
import { FSRS6Model } from '@/models/fsrs-6/model.js'
import { schedulerLearningStepsMiddleware } from '../learning-steps/middleware.js'
import { schedulerScheduledDaysMiddleware } from './middleware.js'

const now = new Date('2026-01-01T00:00:00.000Z')

function createCore(scheduledDays = 2.9) {
  const fixedIntervalMiddleware = defineMiddleware({
    name: 'test.scheduled-days.interval',
    handlers: {
      review(ctx, next) {
        ctx.scheduledDays = scheduledDays
        next()
      },
    },
  })

  return defineScheduler({ model: FSRS6Model, chrono: dateChrono })
    .use(fixedIntervalMiddleware, schedulerScheduledDaysMiddleware)
    .create({
      config: {
        weights: [...FSRS6_DEFAULT_WEIGHTS],
        enableShortTerm: false,
        numRelearningSteps: 0,
      },
    })
}

describe('schedulerScheduledDaysMiddleware', () => {
  it('defaults a new card scheduledDays to zero', () => {
    expect(createCore().newCard({ now }).scheduledDays).toBe(0)
  })

  it('stores the floored scheduled interval and logs the input interval', () => {
    const core = createCore()
    const card = { ...core.newCard({ now }), scheduledDays: 7.5 }

    const result = core.review({ card, grade: Rating.Easy, now })

    expect(result.card.scheduledDays).toBe(2)
    expect(result.revlog.scheduledDays).toBe(7.5)
  })

  it('defaults a missing scheduled interval to zero', () => {
    const ctx = {
      input: { card: { scheduledDays: 7 } },
      result: {
        card: { scheduledDays: -1 },
        revlog: { scheduledDays: -1 },
      },
      scheduledDays: undefined,
    }

    schedulerScheduledDaysMiddleware.handlers!.review!(ctx as never, () => {})

    expect(ctx.result.card.scheduledDays).toBe(0)
    expect(ctx.result.revlog.scheduledDays).toBe(7)
  })

  it('stores an interval selected by a later middleware during unwind', () => {
    const intervalMiddleware = defineMiddleware({
      name: 'test.scheduled-days.post-interval',
      handlers: {
        review(ctx, next) {
          next()
          ctx.scheduledDays = 4.9
        },
      },
    })
    const core = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
      .use(schedulerScheduledDaysMiddleware, intervalMiddleware)
      .create({
        config: {
          weights: [...FSRS6_DEFAULT_WEIGHTS],
          enableShortTerm: false,
          numRelearningSteps: 0,
        },
      })

    const result = core.review({
      card: core.newCard({ now }),
      grade: Rating.Good,
      now,
    })

    expect(result.card.scheduledDays).toBe(4)
    expect(result.card.dueAt.getTime() - now.getTime()).toBe(
      Math.trunc(4.9 * 24 * 60 * 60 * 1000)
    )
  })

  it('clamps a negative scheduled interval to zero', () => {
    const core = createCore(-1.2)
    const result = core.review({
      card: core.newCard({ now }),
      grade: Rating.Again,
      now,
    })

    expect(result.card.scheduledDays).toBe(0)
  })

  it('stores a rounded learning interval at the day threshold', () => {
    const core = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
      .use(schedulerScheduledDaysMiddleware, schedulerLearningStepsMiddleware)
      .create({
        config: {
          weights: [...FSRS6_DEFAULT_WEIGHTS],
          enableShortTerm: true,
          numRelearningSteps: 0,
          learningSteps: ['1439.6m'],
          relearningSteps: [],
        },
      })

    const result = core.review({
      card: core.newCard({ now }),
      grade: Rating.Again,
      now,
    })

    expect(result.card.state).toBe(State.Review)
    expect(result.card.scheduledDays).toBe(1)
    expect(result.card.dueAt.getTime() - now.getTime()).toBe(1440 * 60_000)
  })

  it('restores scheduledDays during rollback', () => {
    const core = createCore()
    const card = { ...core.newCard({ now }), scheduledDays: -1.5 }
    const result = core.review({ card, grade: Rating.Easy, now })

    expect(result.revlog.scheduledDays).toBe(-1.5)
    expect(core.rollback(result).scheduledDays).toBe(-1.5)
  })
})
