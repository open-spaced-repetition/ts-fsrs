import { z } from 'zod/mini'
import type { Grade } from '../models.js'
import { Rating } from '../models.js'
import { defineSchedulerMiddleware } from '../scheduler/middleware.js'

export const ratingIntervalsStoreKey = Symbol('scheduler.ratingIntervals')

export type RatingIntervalsStore = {
  readonly [ratingIntervalsStoreKey]?: Map<Grade, number>
}

export const intervalConfigSchema = z.object({
  maximumInterval: z._default(z.number(), 36500),
})

export const intervalStoreSchema = z.object({
  intervalDays: z.number(),
  desiredRetention: z.number(),
  maximumInterval: z.number(),
})

const getRequiredIntervalRatings: Record<Grade, readonly Grade[]> = {
  [Rating.Again]: [Rating.Again],
  [Rating.Hard]: [Rating.Again, Rating.Hard],
  [Rating.Good]: [Rating.Again, Rating.Hard, Rating.Good],
  [Rating.Easy]: [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy],
}

export const intervalMiddleware = defineSchedulerMiddleware({
  configSchema: intervalConfigSchema,
  storeSchema: intervalStoreSchema,
  review(ctx, next) {
    const desiredRetention = ctx.store.get('desiredRetention')
    const maximumInterval = ctx.config.maximumInterval

    const ratings = getRequiredIntervalRatings[ctx.input.rating]
    let previousInterval = -1

    for (let i = 0; i < ratings.length; i++) {
      const rating = ratings[i]
      const memoryState = ctx.candidates(rating)
      const nextInterval = ctx.model.nextInterval(memoryState, desiredRetention)

      const targetInterval = Math.min(
        Math.max(previousInterval + 1, nextInterval),
        maximumInterval
      )

      previousInterval = targetInterval
    }

    ctx.result.card.interval = previousInterval
    return next()
  },
})
