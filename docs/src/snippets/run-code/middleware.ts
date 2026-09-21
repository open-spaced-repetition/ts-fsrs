import { dateChrono, defineMiddleware, defineScheduler, Rating } from 'ts-fsrs'
import { FSRS6_DEFAULT_WEIGHTS, FSRS6Model } from 'ts-fsrs/models/fsrs-6'
import { z } from 'zod'

const streakFields = z.object({ streak: z.int().nonnegative() })
const streakMiddleware = defineMiddleware({
  name: Symbol('guide.streak'),
  schema: {
    config: z.object({ streakLimit: z.int().positive() }),
    card: streakFields,
    revlog: streakFields,
  },
  defaultValue: { card: () => ({ streak: 0 }) },
  handlers: {
    review(ctx, next) {
      next()
      const { card, grade } = ctx.input
      ctx.result.revlog.streak = card.streak
      ctx.result.card.streak =
        grade === Rating.Again
          ? 0
          : Math.min(card.streak + 1, ctx.config.streakLimit)
    },
    rollback(ctx, next) {
      next()
      ctx.result.card.streak = ctx.input.revlog.streak
    },
  },
})

const base = defineScheduler({ model: FSRS6Model, chrono: dateChrono })
const scheduler = base.use(streakMiddleware).create({
  config: {
    weights: FSRS6_DEFAULT_WEIGHTS,
    enableShortTerm: false,
    numRelearningSteps: 0,
    streakLimit: 2,
  },
})

const now = new Date('2026-01-01T00:00:00.000Z')
const initial = scheduler.newCard({ now })
const good = scheduler.review({ card: initial, grade: Rating.Good, now })
const again = scheduler.review({
  card: good.card,
  grade: Rating.Again,
  now: good.card.dueAt,
})
const restored = scheduler.rollback(again)
const preview = Array.from(
  scheduler.preview({ card: restored, now: good.card.dueAt })
)

console.log(
  JSON.stringify(
    {
      initial: initial.streak,
      afterGood: good.card.streak,
      afterAgain: again.card.streak,
      savedBeforeAgain: again.revlog.streak,
      restored: restored.streak,
      preview: preview.map(({ card }) => card.streak),
      afterPreview: restored.streak,
    },
    null,
    2
  )
)
