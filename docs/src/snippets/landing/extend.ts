import { dateChrono, defineMiddleware, defineScheduler, Rating } from 'ts-fsrs'
import { FSRS6_DEFAULT_WEIGHTS, FSRS6Model } from 'ts-fsrs/models/fsrs-6'
import { z } from 'zod'

// Any Standard Schema validator works here: `streak` is validated at runtime
// and inferred into the card type at the same time.
const streakMiddleware = defineMiddleware({
  name: Symbol('landing.streak'),
  schema: { card: z.object({ streak: z.int().nonnegative() }) },
  defaultValue: { card: () => ({ streak: 0 }) },
  handlers: {
    review(ctx, next) {
      next()
      const { card, grade } = ctx.input
      ctx.result.card.streak = grade === Rating.Again ? 0 : card.streak + 1
    },
  },
})

const fsrs6 = defineScheduler({ model: FSRS6Model, chrono: dateChrono })

export const scheduler = fsrs6.use(streakMiddleware).create({
  config: {
    weights: FSRS6_DEFAULT_WEIGHTS,
    enableShortTerm: false,
    numRelearningSteps: 0,
  },
})

export const now = new Date('2026-01-01T00:00:00.000Z')
export const card = scheduler.newCard({ now })
