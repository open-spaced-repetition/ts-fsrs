import {
  defineMiddleware,
  defineScheduler,
  Rating,
  State,
} from '@open-spaced-repetition/srs-kit'
import { dateChrono } from '@open-spaced-repetition/srs-kit/chrono/date'
import { describe, expect, it, vi } from 'vitest'
import { FSRS6_DEFAULT_WEIGHTS, FSRS6Model } from '@/models/fsrs-6/index.js'
import { schedulerMaximumIntervalMiddleware } from '../maximum-interval/middleware.js'
import { schedulerLearningStepsMiddleware } from './middleware.js'
import type { StepUnit } from './types.js'

function createCore({
  enableShortTerm = true,
  learningSteps = ['1m', '10m'],
  relearningSteps = ['10m'],
  graduatingInterval,
  allowModelOverride,
}: {
  readonly enableShortTerm?: boolean
  readonly learningSteps?: readonly StepUnit[]
  readonly relearningSteps?: readonly StepUnit[]
  readonly graduatingInterval?: number
  readonly allowModelOverride?: boolean
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
        graduatingInterval,
        allowModelOverride,
      },
    })
}

describe('schedulerLearningStepsMiddleware integration', () => {
  it('rejects unsafe relearning-step counts at create', () => {
    const definition = defineScheduler({
      model: FSRS6Model,
      chrono: dateChrono,
    }).use(schedulerLearningStepsMiddleware)
    for (const numRelearningSteps of [0.5, 2 ** 53]) {
      expect(() =>
        definition.create({
          config: {
            weights: [...FSRS6_DEFAULT_WEIGHTS],
            enableShortTerm: true,
            numRelearningSteps,
            learningSteps: ['1m'],
            relearningSteps: ['10m'],
          },
        })
      ).toThrow()
    }
  })

  it('rejects sparse and overflowing steps when creating a scheduler', () => {
    for (const learningSteps of [
      new Array<StepUnit>(1),
      ['1e308m' as StepUnit],
      ['1e308d' as StepUnit],
    ]) {
      expect(() => createCore({ learningSteps })).toThrow(
        'Expected valid learningSteps array'
      )
    }
  })

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
    expect(hard.card.dueAt.getTime() - now.getTime()).toBe(5.5 * 60_000)

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

  it('graduates from learning steps for at least the graduating interval', () => {
    const now = new Date(2022, 11, 29, 12, 30)
    for (const [graduatingInterval, expected] of [
      [undefined, 86_400_000],
      [0.5, 43_200_000],
    ] as const) {
      const core = createCore({ learningSteps: ['1m'], graduatingInterval })
      const card = core.newCard({ now })
      vi.spyOn(core.model, 'nextInterval').mockReturnValue(0.25)

      for (const grade of [Rating.Good, Rating.Easy]) {
        const result = core.review({ card, grade, now })
        expect(result.card.dueAt.getTime() - now.getTime()).toBe(expected)
        expect(result.card.state).toBe(State.Review)
        expect(result.card.learningStep).toBe(0)
      }
    }
  })

  it('keeps passing reviews in review for at least the graduating interval', () => {
    const now = new Date(2022, 11, 29, 12, 30)
    for (const [relearningSteps, expected, state] of [
      [['10m'], 86_400_000, State.Review],
      [[], 21_600_000, State.Relearning],
    ] as const) {
      const core = createCore({ relearningSteps })
      const card = core.review({
        card: core.newCard({ now }),
        grade: Rating.Easy,
        now,
      }).card
      vi.spyOn(core.model, 'nextInterval').mockReturnValue(0.25)
      for (const grade of [Rating.Hard, Rating.Good, Rating.Easy]) {
        const result = core.review({ card, grade, now })
        expect(result.card.dueAt.getTime() - now.getTime()).toBe(expected)
        expect(result.card.state).toBe(state)
      }
    }
  })

  it('classifies intervals by the graduating interval', () => {
    const now = new Date(2022, 11, 29, 12, 30)
    for (const [modelInterval, state] of [
      [0.4, State.Learning],
      [0.6, State.Review],
    ] as const) {
      const core = createCore({ learningSteps: [], graduatingInterval: 0.5 })
      vi.spyOn(core.model, 'nextInterval').mockReturnValue(modelInterval)
      const result = core.review({
        card: core.newCard({ now }),
        grade: Rating.Good,
        now,
      })
      expect(result.card.state).toBe(state)
    }
  })

  it('does not apply the graduation floor to empty learning steps', () => {
    const core = createCore({ learningSteps: [] })
    const now = new Date(2022, 11, 29, 12, 30)
    vi.spyOn(core.model, 'nextInterval').mockReturnValue(0.25)
    const result = core.review({
      card: core.newCard({ now }),
      grade: Rating.Good,
      now,
    })
    expect(result.card.dueAt.getTime() - now.getTime()).toBe(21_600_000)
    expect(result.card.state).toBe(State.Learning)
  })

  it.each([
    // [model days, Again, Hard, Good] in minutes
    [0.5 / 1440, 1, 5.5, 10],
    [30 / 1440, 30, 30, 30],
    [2, 1440, 2880, 2880],
  ])(
    'lets a model interval of %s days override shorter steps',
    (modelInterval, again, hard, good) => {
      const core = createCore({ allowModelOverride: true })
      const now = new Date(2022, 11, 29, 12, 30)
      const card = core.newCard({ now })
      vi.spyOn(core.model, 'nextInterval').mockReturnValue(modelInterval)
      const results = [Rating.Again, Rating.Hard, Rating.Good].map((grade) =>
        core.review({ card, grade, now })
      )

      expect(
        results.map(
          (result) => (result.card.dueAt.getTime() - now.getTime()) / 60_000
        )
      ).toEqual([again, hard, good])
      // Again stays in learning; a day or more graduates Hard and Good early.
      expect(results[0].card.state).toBe(State.Learning)
      expect(results[0].card.learningStep).toBe(0)
      for (const [index, result] of results.slice(1).entries()) {
        expect(result.card.state).toBe(
          modelInterval >= 1 ? State.Review : State.Learning
        )
        expect(result.card.learningStep).toBe(
          modelInterval >= 1 ? 0 : index === 0 ? 0 : 1
        )
      }
    }
  )

  it('graduates grades whose step is zero minutes', () => {
    const core = createCore({ learningSteps: ['0m'] })
    const now = new Date(2022, 11, 29, 12, 30)
    const card = core.newCard({ now })
    vi.spyOn(core.model, 'nextInterval').mockReturnValue(0.25)

    // Hard's 0m step counts as no step; Again keeps the model interval.
    const hard = core.review({ card, grade: Rating.Hard, now })
    expect(hard.card.dueAt.getTime() - now.getTime()).toBe(86_400_000)
    expect(hard.card.state).toBe(State.Review)
    const again = core.review({ card, grade: Rating.Again, now })
    expect(again.card.dueAt.getTime() - now.getTime()).toBe(21_600_000)
    expect(again.card.state).toBe(State.Learning)
  })

  it('resets learningStep when a step reaches review', () => {
    const core = createCore({
      learningSteps: ['1d', '2d'],
      relearningSteps: ['10m', '20m'],
    })
    const now = new Date(2022, 11, 29, 12, 30)
    const result = core.review({
      card: core.newCard({ now }),
      grade: Rating.Good,
      now,
    })

    expect(result.card.dueAt.getTime() - now.getTime()).toBe(2 * 86_400_000)
    expect(result.card.state).toBe(State.Review)
    expect(result.card.learningStep).toBe(0)
    expect(core.rollback(result).learningStep).toBe(0)
  })

  it.each([
    [true, 2 * 86_400_000, State.Review, 0],
    [false, 5.5 * 60_000, State.Learning, 0],
  ] as const)(
    'keeps downstream policies on a model override (allowModelOverride=%s)',
    (allowModelOverride, expectedDelay, state, learningStep) => {
      const core = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
        .use(
          schedulerLearningStepsMiddleware,
          schedulerMaximumIntervalMiddleware
        )
        .create({
          config: {
            weights: [...FSRS6_DEFAULT_WEIGHTS],
            enableShortTerm: true,
            numRelearningSteps: 1,
            learningSteps: ['1m', '10m'],
            relearningSteps: ['10m'],
            allowModelOverride,
            maximumInterval: 2,
          },
        })
      const now = new Date(2022, 11, 29, 12, 30)
      vi.spyOn(core.model, 'nextInterval').mockReturnValue(3)
      const result = core.review({
        card: core.newCard({ now }),
        grade: Rating.Hard,
        now,
      })

      // An overriding 3d model interval is capped downstream instead of being
      // replaced by the 5.5m Hard step.
      expect(result.card.dueAt.getTime() - now.getTime()).toBe(expectedDelay)
      expect(result.card.state).toBe(state)
      expect(result.card.learningStep).toBe(learningStep)
    }
  )

  it.each([false, true])(
    'enters review from a one-day Again step (allowModelOverride=%s)',
    (allowModelOverride) => {
      const core = createCore({ learningSteps: ['1d'], allowModelOverride })
      const now = new Date(2022, 11, 29, 12, 30)
      vi.spyOn(core.model, 'nextInterval').mockReturnValue(0.25)
      const result = core.review({
        card: core.newCard({ now }),
        grade: Rating.Again,
        now,
      })

      expect(result.card.dueAt.getTime() - now.getTime()).toBe(86_400_000)
      expect(result.card.state).toBe(State.Review)
      expect(result.card.learningStep).toBe(0)
    }
  )

  it('caps an overriding Again at the graduating interval', () => {
    const core = createCore({
      allowModelOverride: true,
      graduatingInterval: 0.5,
    })
    const now = new Date(2022, 11, 29, 12, 30)
    const reviewed = core.review({
      card: core.newCard({ now }),
      grade: Rating.Easy,
      now,
    })
    vi.spyOn(core.model, 'nextInterval').mockReturnValue(13)
    const result = core.review({
      card: reviewed.card,
      grade: Rating.Again,
      now,
    })

    expect(result.card.dueAt.getTime() - now.getTime()).toBe(43_200_000)
    expect(result.card.state).toBe(State.Relearning)
    expect(result.card.scheduleStatus).toBe('learning')
    expect(result.card.learningStep).toBe(0)
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
            ctx.candidate.desiredRetention[Rating.Easy]
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
    ['0.6m', State.Learning, 'learning', 0.6],
    ['1439.4m', State.Learning, 'learning', 1439.4],
    ['1439.6m', State.Learning, 'learning', 1439.6],
    ['1440m', State.Review, 'review', 1440],
  ] as const)(
    'preserves second precision before applying the day threshold',
    (step, state, scheduleStatus, scheduledMinutes) => {
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
    }
  )

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

  it.each(['0m'] as const)(
    'falls back to the model interval when %s has no positive duration',
    (step) => {
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
    }
  )

  it.each([
    ['0.017m', 1_000],
    ['0.1m', 6_000],
    ['0.4m', 24_000],
  ] as const)(
    'schedules %s with second precision instead of using the model interval',
    (step, expectedDelay) => {
      const core = createCore({ learningSteps: [step] })
      const now = new Date(2022, 11, 29, 12, 30)
      const nextInterval = vi.spyOn(core.model, 'nextInterval')
      const result = core.review({
        card: core.newCard({ now }),
        grade: Rating.Again,
        now,
      })

      expect(result.card.state).toBe(State.Learning)
      expect(result.card.scheduleStatus).toBe('learning')
      expect(result.card.learningStep).toBe(0)
      expect(result.card.dueAt.getTime() - now.getTime()).toBe(expectedDelay)
      expect(nextInterval).not.toHaveBeenCalled()
    }
  )
  it('keeps a sub-day relearning step in the relearning state', () => {
    const core = createCore({ relearningSteps: ['1439.6m'] })
    const now = new Date(2022, 11, 29, 12, 30)
    const reviewed = core.review({
      card: core.newCard({ now }),
      grade: Rating.Easy,
      now,
    })
    const nextInterval = vi.spyOn(core.model, 'nextInterval')
    const result = core.review({
      card: reviewed.card,
      grade: Rating.Again,
      now: reviewed.card.dueAt,
    })

    expect(result.card.state).toBe(State.Relearning)
    expect(result.card.scheduleStatus).toBe('learning')
    expect(result.card.learningStep).toBe(0)
    expect(result.card.dueAt.getTime() - reviewed.card.dueAt.getTime()).toBe(
      1439.6 * 60_000
    )
    expect(nextInterval).not.toHaveBeenCalled()
  })

  it.each([
    ['zero-minute', ['0m'], 0],
    ['empty', [], 0],
    ['exhausted', ['1m'], 1],
  ] as const)(
    'uses raw model intervals without monotonic middleware for %s steps',
    (_name, steps, learningStep) => {
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
    }
  )

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
