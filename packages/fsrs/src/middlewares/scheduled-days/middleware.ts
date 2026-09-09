import {
  defineMiddleware,
  fractionalDaysConfigSchema,
} from '@open-spaced-repetition/srs-kit'
import { scheduledDaysFieldsSchema } from './schema.js'

/** Register before interval middleware so it records their final value on unwind. */
export const schedulerScheduledDaysMiddleware = defineMiddleware({
  name: Symbol('ts-fsrs.scheduled-days'),
  schema: {
    config: fractionalDaysConfigSchema,
    card: scheduledDaysFieldsSchema,
    revlog: scheduledDaysFieldsSchema,
  },
  defaultValue: {
    card() {
      return { scheduledDays: 0 }
    },
  },
  handlers: {
    review(ctx, next) {
      const previousScheduledDays = ctx.input.card.scheduledDays
      next()

      const days = Math.max(0, ctx.scheduledDays ?? 0)
      ctx.result.card.scheduledDays = ctx.config.fractionalDays
        ? days
        : Math.floor(days)
      ctx.result.revlog.scheduledDays = previousScheduledDays
    },

    rollback(ctx, next) {
      next()
      ctx.result.card.scheduledDays = ctx.input.revlog.scheduledDays
    },
  },
})
