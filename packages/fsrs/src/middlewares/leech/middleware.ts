import {
  defineMiddleware,
  Rating,
  State,
} from '@open-spaced-repetition/srs-kit'
import { leechCardFieldsSchema, leechConfigSchema } from './schema.js'

/** Register before middleware that writes scheduleStatus after next(). */
export const schedulerLeechMiddleware = defineMiddleware({
  name: Symbol('ts-fsrs.leech'),
  scheduleStatus: ['suspended'],
  schema: {
    config: leechConfigSchema,
    card: leechCardFieldsSchema,
  },
  defaultValue: {
    card(ctx) {
      return {
        lapses:
          ctx.operation === 'forget' && ctx.config.clearStatsOnForget === false
            ? ctx.input.lapses
            : 0,
      }
    },
  },
  handlers: {
    review(ctx, next) {
      next()
      const card = ctx.input.card
      const previousState = card.state
      const isLapse =
        previousState === State.Review && ctx.input.grade === Rating.Again

      ctx.result.card.lapses ??= isLapse ? card.lapses + 1 : card.lapses
      const { lapses } = ctx.result.card
      const { leechThreshold } = ctx.config
      if (isLapse && leechThreshold > 0 && lapses % leechThreshold === 0) {
        ctx.result.card.scheduleStatus = 'suspended'
      }
    },

    rollback(ctx, next) {
      next()
      const card = ctx.input.card
      const revlog = ctx.input.revlog
      const isLapse =
        revlog.rating === Rating.Again && revlog.state === State.Review
      ctx.result.card.lapses ??= Math.max(0, card.lapses - (isLapse ? 1 : 0))
    },
  },
})
