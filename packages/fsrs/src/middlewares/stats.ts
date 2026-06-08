import { z } from 'zod/mini'
import { Rating, State } from '../models.js'
import { defineSchedulerMiddleware } from '../scheduler/middleware.js'

export const statsFieldSchema = z.object({
  reps: z._default(z.number(), 0),
  state: z._default(z.enum(State), State.New),
  lapses: z._default(z.number(), 0),
})

export const statsMiddleware = defineSchedulerMiddleware({
  fieldSchema: statsFieldSchema,
  fieldDefaults: {
    reps: 0,
    state: State.New,
    lapses: 0,
  },
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
