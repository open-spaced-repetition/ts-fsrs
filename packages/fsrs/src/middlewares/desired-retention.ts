import { z } from 'zod/mini'
import { defineSchedulerMiddleware } from '../kit/scheduler/middleware.js'

export const desiredRetentionConfigSchema = z.object({
  desiredRetention: z._default(z.number(), 0.9),
})

export const desiredRetentionStoreSchema = z.object({
  desiredRetention: z.number(),
})

export const desiredRetentionMiddleware = defineSchedulerMiddleware({
  configSchema: desiredRetentionConfigSchema,
  storeSchema: desiredRetentionStoreSchema,
  review(ctx, next) {
    // TODO cost ADR
    ctx.store.set('desiredRetention', ctx.config.desiredRetention)
    next()
  },
  rollback(ctx, next) {
    ctx.store.set('desiredRetention', ctx.config.desiredRetention)
    next()
  },
})
