import { z } from 'zod/mini'
import { defineSchedulerMiddleware } from '../scheduler/middleware.js'

const intervalConfigSchema = z.object({
  maximumInterval: z._default(z.number(), 36500),
})

const intervalStoreSchema = z.object({
  desiredRetention: z.number(),
})

/**
 * Computes the base interval for the reviewed rating: the model's next interval
 * clamped into `[1, maximumInterval]`. Cross-rating uniqueness (Again < Hard <
 * Good < Easy) is layered on top by {@link monotonicIntervalMiddleware}.
 */
export const intervalMiddleware = defineSchedulerMiddleware({
  configSchema: intervalConfigSchema,
  storeSchema: intervalStoreSchema,
  review(ctx, next) {
    const desiredRetention = ctx.store.get('desiredRetention')
    const maximumInterval = ctx.config.maximumInterval

    const memoryState = ctx.candidates(ctx.input.rating)
    const nextInterval = ctx.model.nextInterval(memoryState, desiredRetention)
    ctx.result.card.interval = Math.min(
      Math.max(nextInterval, 1),
      maximumInterval
    )
    return next()
  },
})
