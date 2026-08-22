import {
  defineMiddleware,
  defineScheduler,
  Rating,
  State,
} from '@open-spaced-repetition/srs-kit'
import { dateChrono } from '@open-spaced-repetition/srs-kit/chrono/date'
import { describe, expect, it, vi } from 'vitest'
import { FSRS6_DEFAULT_WEIGHTS, FSRS6Model } from '@/models/fsrs-6/index.js'
import { schedulerLearningStepsMiddleware } from './middleware.js'
import type { StepUnit } from './types.js'

function createCore({
  enableShortTerm = true,
  learningSteps = ['1m', '10m'],
  relearningSteps = ['10m'],
}: {
  readonly enableShortTerm?: boolean
  readonly learningSteps?: readonly StepUnit[]
  readonly relearningSteps?: readonly StepUnit[]
} = {}) {
  return defineScheduler({ model: FSRS6Model, chrono: dateChrono })
    .use(schedulerLearningStepsMiddleware)
    .create({
      config: {
        weights: [...FSRS6_DEFAULT_WEIGHTS],
        enableShortTerm,
        numRelearningSteps: relearningSteps.length,
        learningSteps,
        relearningSteps,
      },
    })
}

describe('schedulerLearningStepsMiddleware integration', () => {
  it('accepts card input without learningStep', () => {
    const core = createCore()
    const now = new Date(2022, 11, 29, 12, 30)
    const { learningStep: _, ...card } = core.newCard({ now })
    const result = core.review({ card, grade: Rating.Again, now })

    expect(result.revlog.learningStep).toBe(0)
    expect(result.card.learningStep).toBe(0)
  })

  it('schedules every grade from a new card like the legacy FSRS scheduler', () => {
    const core = createCore()
    const now = new Date(2022, 11, 29, 12, 30)
    const card = core.newCard({ now })
    const previews = new Map(
      Array.from(core.preview({ card, now }), (item) => [item.grade, item])
    )

    expect(card.learningStep).toBe(0)

    const again = previews.get(Rating.Again)!
    expect(again.card.state).toBe(State.Learning)
    expect(again.card.scheduleStatus).toBe('learning')
    expect(again.card.learningStep).toBe(0)
    expect(again.card.dueAt.getTime() - now.getTime()).toBe(60_000)
    expect(again.revlog.learningStep).toBe(0)

    const hard = previews.get(Rating.Hard)!
    expect(hard.card.state).toBe(State.Learning)
    expect(hard.card.learningStep).toBe(0)
    expect(hard.card.dueAt.getTime() - now.getTime()).toBe(6 * 60_000)

    const good = previews.get(Rating.Good)!
    expect(good.card.state).toBe(State.Learning)
    expect(good.card.learningStep).toBe(1)
    expect(good.card.dueAt.getTime() - now.getTime()).toBe(10 * 60_000)

    const easy = previews.get(Rating.Easy)!
    expect(easy.card.state).toBe(State.Review)
    expect(easy.card.scheduleStatus).toBe('review')
    expect(easy.card.learningStep).toBe(0)
  })

  it('uses the model interval only when no positive learning step exists', () => {
    const core = createCore({ learningSteps: ['1m'] })
    const now = new Date(2022, 11, 29, 12, 30)
    const card = core.newCard({ now })
    const nextInterval = vi.spyOn(core.model, 'nextInterval')

    core.review({ card, grade: Rating.Again, now })
    expect(nextInterval).not.toHaveBeenCalled()

    core.review({ card, grade: Rating.Easy, now })
    expect(nextInterval).toHaveBeenCalledOnce()
  })

  it('reflects learningSteps mutated after creation', () => {
    const core = createCore()
    const now = new Date(2022, 11, 29, 12, 30)
    // First review populates the memoized schedule for (New, 0) with '1m'.
    core.review({ card: core.newCard({ now }), grade: Rating.Again, now })
    // learningStepsConfigSchema keeps the caller's array reference, so this
    // mutation also changes the array the middleware reads on the next review.
    const mutableConfig = core.config as unknown as {
      learningSteps: string[]
    }
    mutableConfig.learningSteps[0] = '30m'

    const result = core.review({
      card: core.newCard({ now }),
      grade: Rating.Again,
      now,
    })

    // Without the immutability gate the memoized '1m' schedule would win.
    expect(result.card.dueAt.getTime() - now.getTime()).toBe(30 * 60_000)
  })

  it('delegates intervals for uncached candidate memory states', () => {
    let interval: number | undefined
    const probe = defineMiddleware({
      name: Symbol('uncached-candidate'),
      handlers: {
        review(ctx, next) {
          const memoryState = { ...ctx.candidate.step(Rating.Easy) }
          interval = ctx.candidate.nextInterval(
            memoryState,
            ctx.desiredRetention
          )
          next()
        },
      },
    })
    const core = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
      .use(schedulerLearningStepsMiddleware, probe)
      .create({
        config: {
          weights: [...FSRS6_DEFAULT_WEIGHTS],
          enableShortTerm: true,
          numRelearningSteps: 1,
          learningSteps: ['1m'],
          relearningSteps: ['10m'],
        },
      })
    const nextInterval = vi.spyOn(core.model, 'nextInterval')
    const now = new Date(2022, 11, 29, 12, 30)

    core.review({ card: core.newCard({ now }), grade: Rating.Again, now })

    expect(interval).toBeGreaterThan(0)
    expect(nextInterval).toHaveBeenCalledOnce()
  })

  it('graduates after the final learning step', () => {
    const core = createCore()
    const now = new Date(2022, 11, 29, 12, 30)
    const first = core.review({
      card: core.newCard({ now }),
      grade: Rating.Good,
      now,
    })
    const second = core.review({
      card: first.card,
      grade: Rating.Good,
      now: first.card.dueAt,
    })

    expect(first.card.learningStep).toBe(1)
    expect(second.card.state).toBe(State.Review)
    expect(second.card.scheduleStatus).toBe('review')
    expect(second.card.learningStep).toBe(0)
  })

  it('keeps intermediate learning and relearning states', () => {
    const core = createCore({
      learningSteps: ['1m', '10m', '20m'],
      relearningSteps: ['10m', '20m'],
    })
    const now = new Date(2022, 11, 29, 12, 30)
    const first = core.review({
      card: core.newCard({ now }),
      grade: Rating.Good,
      now,
    })
    expect(first.card.state).toBe(State.Learning)
    expect(first.card.learningStep).toBe(1)

    const learning = core.review({
      card: first.card,
      grade: Rating.Good,
      now: first.card.dueAt,
    })
    expect(learning.card.state).toBe(State.Learning)
    expect(learning.card.learningStep).toBe(2)

    const reviewed = core.review({
      card: core.newCard({ now }),
      grade: Rating.Easy,
      now,
    })
    expect(reviewed.card.state).toBe(State.Review)
    expect(reviewed.card.learningStep).toBe(0)
    const lapse = core.review({
      card: reviewed.card,
      grade: Rating.Again,
      now: reviewed.card.dueAt,
    })
    const relearning = core.review({
      card: lapse.card,
      grade: Rating.Good,
      now: lapse.card.dueAt,
    })
    expect(relearning.card.state).toBe(State.Relearning)
    expect(relearning.card.learningStep).toBe(1)
  })

  it('moves a review lapse into relearning', () => {
    const core = createCore({ relearningSteps: ['10m', '20m'] })
    const now = new Date(2022, 11, 29, 12, 30)
    const reviewed = core.review({
      card: core.newCard({ now }),
      grade: Rating.Easy,
      now,
    })
    const lapse = core.review({
      card: reviewed.card,
      grade: Rating.Again,
      now: reviewed.card.dueAt,
    })

    expect(lapse.card.state).toBe(State.Relearning)
    expect(lapse.card.scheduleStatus).toBe('learning')
    expect(lapse.card.learningStep).toBe(0)
    expect(lapse.card.dueAt.getTime() - reviewed.card.dueAt.getTime()).toBe(
      10 * 60_000
    )
  })

  it.each([
    ['0.6m', State.Learning, 'learning', 1],
    ['1439.4m', State.Learning, 'learning', 1439],
    ['1439.6m', State.Review, 'review', 1440],
    ['1440m', State.Review, 'review', 1440],
  ] as const)('rounds %s before applying the day threshold', (step, state, scheduleStatus, scheduledMinutes) => {
    const core = createCore({ learningSteps: [step] })
    const now = new Date(2022, 11, 29, 12, 30)
    const result = core.review({
      card: core.newCard({ now }),
      grade: Rating.Again,
      now,
    })

    expect(result.card.state).toBe(state)
    expect(result.card.scheduleStatus).toBe(scheduleStatus)
    expect(result.card.dueAt.getTime() - now.getTime()).toBe(
      scheduledMinutes * 60_000
    )
  })

  it('graduates long learning delays while preserving the exact due time', () => {
    const core = createCore({ learningSteps: ['1.5d'] })
    const now = new Date(2022, 11, 29, 12, 30)
    const result = core.review({
      card: core.newCard({ now }),
      grade: Rating.Again,
      now,
    })

    expect(result.card.state).toBe(State.Review)
    expect(result.card.scheduleStatus).toBe('review')
    expect(result.card.learningStep).toBe(0)
    expect(result.card.dueAt.getTime() - now.getTime()).toBe(2160 * 60_000)
  })

  it.each([
    '0m',
    '0.4m',
  ] as const)('falls back to the model interval when %s rounds to zero minutes', (step) => {
    const core = createCore({ learningSteps: [step] })
    const now = new Date(2022, 11, 29, 12, 30)
    const result = core.review({
      card: core.newCard({ now }),
      grade: Rating.Again,
      now,
    })

    expect(result.card.state).toBe(State.Review)
    expect(result.card.scheduleStatus).toBe('review')
    expect(result.card.learningStep).toBe(0)
    expect(result.card.dueAt.getTime()).toBeGreaterThan(now.getTime())
  })

  it.each([
    ['zero-minute', ['0m'], 0],
    ['rounded zero-minute', ['0.4m', '0.4m'], 0],
    ['empty', [], 0],
    ['exhausted', ['1m'], 1],
  ] as const)('uses raw model intervals without monotonic middleware for %s steps', (_name, steps, learningStep) => {
    const seedCore = createCore()
    const now = new Date(2022, 11, 29, 12, 30)
    const learningCard = seedCore.review({
      card: seedCore.newCard({ now }),
      grade: Rating.Again,
      now,
    }).card
    const reviewCard = seedCore.review({
      card: seedCore.newCard({ now }),
      grade: Rating.Easy,
      now,
    }).card
    const relearningCard = seedCore.review({
      card: reviewCard,
      grade: Rating.Again,
      now: reviewCard.dueAt,
    }).card
    const core = createCore({
      learningSteps: steps,
      relearningSteps: steps,
    })
    const previewDueDays = (card: typeof learningCard) => {
      const reviewTime = card.dueAt
      return Array.from(
        core.preview({
          card: { ...card, learningStep },
          now: reviewTime,
        }),
        (item) =>
          (item.card.dueAt.getTime() - reviewTime.getTime()) / 86_400_000
      )
    }

    expect(learningCard.state).toBe(State.Learning)
    expect(relearningCard.state).toBe(State.Relearning)
    expect(previewDueDays(learningCard)).toEqual([1, 1, 1, 1])
    expect(previewDueDays(relearningCard)).toEqual([1, 1, 1, 2])
  })

  it('bypasses learning steps when short-term scheduling is disabled', () => {
    const core = createCore({ enableShortTerm: false })
    const now = new Date(2022, 11, 29, 12, 30)
    const result = core.review({
      card: core.newCard({ now }),
      grade: Rating.Again,
      now,
    })

    expect(result.card.state).toBe(State.Review)
    expect(result.card.scheduleStatus).toBe('review')
    expect(result.card.learningStep).toBe(0)
    expect(result.revlog.learningStep).toBe(0)
  })

  it('restores learningStep during rollback', () => {
    const core = createCore()
    const now = new Date(2022, 11, 29, 12, 30)
    const first = core.review({
      card: core.newCard({ now }),
      grade: Rating.Good,
      now,
    })
    const second = core.review({
      card: first.card,
      grade: Rating.Good,
      now: first.card.dueAt,
    })

    expect(first.card.learningStep).toBe(1)
    expect(second.card.learningStep).toBe(0)
    expect(core.rollback(second).learningStep).toBe(1)
  })
})
