import { defineMiddleware } from '@open-spaced-repetition/srs-kit'
import { scheduledDaysFieldsSchema } from './schema.js'

/** Register before interval middleware so it records their final value on unwind. */
export const schedulerScheduledDaysMiddleware = defineMiddleware({
  name: Symbol('ts-fsrs.scheduled-days'),
  schema: {
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

      ctx.result.card.scheduledDays = Math.max(
        0,
        Math.floor(ctx.scheduledDays ?? 0)
      )
      ctx.result.revlog.scheduledDays = previousScheduledDays
    },

    rollback(ctx, next) {
      next()
      ctx.result.card.scheduledDays = ctx.input.revlog.scheduledDays
    },
  },
})
