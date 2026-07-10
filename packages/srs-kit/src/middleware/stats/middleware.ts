import { Rating } from '@/primitives/rating.js'
import { State } from '@/primitives/state.js'
import { defineMiddleware } from '../middleware.js'
import { statsConfigSchema, statsFieldsSchema } from './schema.js'

export const schedulerStatsMiddleware = defineMiddleware({
  name: Symbol('srs-kit.stats'),
  schema: {
    config: statsConfigSchema,
    card: statsFieldsSchema,
  },
  defaultValue: {
    card(ctx) {
      const card = ctx.input?.card
      if (card && ctx.config.clearStatsOnForget === false) {
        return {
          reps: card.reps,
          lapses: card.lapses,
        }
      }

      return {
        reps: 0,
        lapses: 0,
      }
    },
  },
  handlers: {
    review(ctx, next) {
      next()
      const card = ctx.input.card
      const previousState = card.state
      const previousLapses = card.lapses
      const isLapse =
        ctx.input.grade === Rating.Again && previousState === State.Review

      ctx.result.card.reps = card.reps + 1
      ctx.result.card.lapses = isLapse ? previousLapses + 1 : previousLapses
    },

    rollback(ctx, next) {
      next()
      const card = ctx.input.card
      const revlog = ctx.input.revlog
      const isLapse =
        revlog.rating === Rating.Again && revlog.state === State.Review

      ctx.result.card.reps = Math.max(0, card.reps - 1)
      ctx.result.card.lapses = Math.max(0, card.lapses - (isLapse ? 1 : 0))
    },
  },
})
