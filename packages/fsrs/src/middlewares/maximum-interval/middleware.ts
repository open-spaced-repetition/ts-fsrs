import { defineMiddleware } from '@open-spaced-repetition/srs-kit'
import { monotonicIntervalConfigSchema } from '../monotonic-interval/schema.js'

/** Register after learning steps so explicit steps can keep their exact delay. */
export const schedulerMaximumIntervalMiddleware = defineMiddleware({
  name: Symbol('ts-fsrs.maximum-interval'),
  schema: {
    config: monotonicIntervalConfigSchema,
  },
  handlers: {
    review(ctx, next) {
      next()
      if (ctx.scheduledDays !== undefined) {
        ctx.scheduledDays = Math.min(
          ctx.scheduledDays,
          ctx.config.maximumInterval
        )
      }
    },
  },
})
