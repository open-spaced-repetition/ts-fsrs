import { z } from 'zod/mini'
import { defineSchedulerMiddleware } from '../kit/scheduler/middleware.js'
import type { Grade } from '../models.js'
import { Rating, State } from '../models.js'

const monotonicIntervalConfigSchema = z.object({
  maximumInterval: z._default(z.number(), 36500),
  enableShortTerm: z._default(z.boolean(), true),
})

const monotonicIntervalStoreSchema = z.object({
  desiredRetention: z.number(),
})

// Each grade requires its own candidate plus every lower grade's, so the chain
// can keep the resulting intervals strictly increasing across ratings.
const getRequiredIntervalRatings: Record<Grade, readonly Grade[]> = {
  [Rating.Again]: [Rating.Again],
  [Rating.Hard]: [Rating.Again, Rating.Hard],
  [Rating.Good]: [Rating.Again, Rating.Hard, Rating.Good],
  [Rating.Easy]: [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy],
}

/**
 * Keeps each rating's interval strictly greater than every lower rating's so
 * Again < Hard < Good < Easy never collide. It walks the again→…→rating chain,
 * forcing each step to be at least one day past the previous one, and overrides
 * the base interval produced by {@link intervalMiddleware} for long-term
 * reviews. Short-term (re)learning graduations are left untouched — their
 * per-step interval is owned by `learningStepMiddleware`.
 */
export const monotonicIntervalMiddleware = defineSchedulerMiddleware({
  configSchema: monotonicIntervalConfigSchema,
  storeSchema: monotonicIntervalStoreSchema,
  review(ctx, next) {
    const result = next()

    // Short-term (re)learning graduations keep each grade's own interval.
    const state = (ctx.input.card as { state?: State }).state
    if (
      ctx.config.enableShortTerm &&
      (state === State.New ||
        state === State.Learning ||
        state === State.Relearning)
    ) {
      return result
    }

    const desiredRetention = ctx.store.get('desiredRetention')
    const maximumInterval = ctx.config.maximumInterval
    const ratings = getRequiredIntervalRatings[ctx.input.rating]
    let previousInterval = -1

    for (let i = 0; i < ratings.length; i++) {
      const rating = ratings[i]
      const memoryState = ctx.candidates(rating)
      const nextInterval = ctx.model.nextInterval(memoryState, desiredRetention)

      previousInterval = Math.min(
        Math.max(previousInterval + 1, nextInterval),
        maximumInterval
      )
    }

    result.card.interval = previousInterval
    return result
  },
})
