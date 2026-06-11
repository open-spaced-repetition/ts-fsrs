import { z } from 'zod/mini'
import { defineSchedulerMiddleware } from '../kit/scheduler/middleware.js'
import { Rating, State } from '../models.js'

export const statsFieldSchema = z.object({
  reps: z._default(z.number(), 0),
  state: z._default(z.enum(State), State.New),
  lapses: z._default(z.number(), 0),
})

export const statsRevlogSchema = z.object({
  state: z.enum(State),
})

export const statsMiddleware = defineSchedulerMiddleware({
  fieldsSchema: {
    card: statsFieldSchema,
    revlog: statsRevlogSchema,
    default: {
      reps: 0,
      state: State.New,
      lapses: 0,
    },
  },
  review(ctx, next) {
    ctx.result.card.reps = ctx.input.card.reps + 1

    if (
      ctx.input.card.state === State.Review &&
      ctx.input.rating === Rating.Again
    ) {
      ctx.result.card.lapses = ctx.input.card.lapses + 1
    }
    ctx.result.card.state = State.Review

    next()
  },
  rollback(ctx, next) {
    next()

    ctx.result.reps = Math.max(0, ctx.input.card.reps - 1)
    ctx.result.lapses = Math.max(
      0,
      ctx.input.card.lapses -
        (ctx.input.revlog.state === State.Review &&
        ctx.input.revlog.rating === Rating.Again
          ? 1
          : 0)
    )
  },
})
