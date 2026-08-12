import {
  defineMiddleware,
  defineScheduler,
  Rating,
} from '@open-spaced-repetition/srs-kit'
import { dateChrono } from '@open-spaced-repetition/srs-kit/chrono/date'
import { describe, expect, it, vi } from 'vitest'
import { FSRS6_DEFAULT_WEIGHTS, FSRS6Model } from '@/models/fsrs-6/index.js'
import { createSchedulerFuzzingMiddleware } from '../fuzzing/middleware.js'
import { schedulerScheduledDaysMiddleware } from '../scheduled-days/middleware.js'
import { schedulerMaximumIntervalMiddleware } from './middleware.js'

const now = new Date('2026-01-01T00:00:00.000Z')
const maximumInterval = 2
const fixedIntervalMiddleware = defineMiddleware({
  name: 'test.maximum-interval.fixed',
  handlers: {
    review(ctx, next) {
      ctx.scheduledDays = 10
      next()
    },
  },
})
const reviewHandler = schedulerMaximumIntervalMiddleware.handlers?.review

if (!reviewHandler) throw new Error('Expected maximum interval review handler')

describe('schedulerMaximumIntervalMiddleware', () => {
  it('leaves an absent scheduledDays value unchanged', () => {
    const ctx = {
      config: { maximumInterval },
      scheduledDays: undefined,
    } as unknown as Parameters<typeof reviewHandler>[0]
    const next = vi.fn()

    reviewHandler(ctx, next)

    expect(next).toHaveBeenCalledOnce()
    expect(ctx.scheduledDays).toBeUndefined()
  })

  it('caps review and preview without fuzzing or monotonic middleware', () => {
    const core = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
      .use(
        fixedIntervalMiddleware,
        schedulerScheduledDaysMiddleware,
        schedulerMaximumIntervalMiddleware
      )
      .create({
        config: {
          weights: [...FSRS6_DEFAULT_WEIGHTS],
          enableShortTerm: false,
          numRelearningSteps: 0,
          maximumInterval,
        },
      })
    const card = core.newCard({ now })

    expect(
      core.review({ card, grade: Rating.Easy, now }).card.scheduledDays
    ).toBe(maximumInterval)
    expect(
      Array.from(core.preview({ card, now }), (item) => item.card.scheduledDays)
    ).toEqual([
      maximumInterval,
      maximumInterval,
      maximumInterval,
      maximumInterval,
    ])
  })

  it('caps intervals when fuzzing is registered but disabled', () => {
    const rng = vi.fn((_seed: string) => () => 0.5)
    const core = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
      .use(
        fixedIntervalMiddleware,
        createSchedulerFuzzingMiddleware({ rng }),
        schedulerScheduledDaysMiddleware,
        schedulerMaximumIntervalMiddleware
      )
      .create({
        config: {
          weights: [...FSRS6_DEFAULT_WEIGHTS],
          enableShortTerm: false,
          numRelearningSteps: 0,
          enableFuzz: false,
          maximumInterval,
        },
      })
    const card = core.newCard({ now, cardId: 'disabled-fuzz' })

    expect(
      core.review({ card, grade: Rating.Easy, now }).card.scheduledDays
    ).toBe(maximumInterval)
    expect(rng).not.toHaveBeenCalled()
  })
})
