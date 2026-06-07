import { z } from 'zod/mini'
import { Rating, State } from '../models.js'
import { defineSchedulerMiddleware } from '../scheduler/middleware.js'

export const statsFieldSchema = z.object({
  reps: z.number(),
  state: z.enum(State),
  lapses: z.number(),
})

export const statsMiddleware = defineSchedulerMiddleware({
  fieldSchema: statsFieldSchema,
  review(ctx, next) {
    ctx.result.card.reps = ctx.input.card.reps + 1

    if (
      ctx.input.card.state === State.Review &&
      ctx.input.rating < Rating.Again
    ) {
      ctx.result.card.lapses = ctx.input.card.lapses + 1
    }
    ctx.result.card.state = State.Review

    return next()
  },
  rollback(_ctx, next) {
    return next()
  },
})
