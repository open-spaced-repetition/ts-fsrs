import { z } from 'zod/mini'
import { defineSchedulerMiddleware } from '../kit/scheduler/middleware.js'
import { withFuzzing } from '../strategies/fuzz.js'

export const fuzzConfigSchema = z.object({
  enableFuzz: z._default(z.boolean(), false),
})

export const fuzzFieldSchema = z.object({
  cardId: z.string(),
  reps: z.number(),
})

export const fuzzMiddleware = defineSchedulerMiddleware({
  configSchema: fuzzConfigSchema,
  fieldSchema: fuzzFieldSchema,
  review(ctx, next) {
    const result = next()
    const sourceInterval = result.card.interval
    const maximumInterval =
      ctx.store.get<{ maximumInterval?: number }>('maximumInterval') ?? 36500

    const seed = `${ctx.input.card.cardId}:${ctx.input.card.reps}`
    const interval = withFuzzing(
      sourceInterval,
      ctx.input.elapsedDays,
      {
        enable_fuzz: ctx.config.enableFuzz,
        maximum_interval: maximumInterval,
      },
      seed
    )

    result.card.interval = interval
    return result
  },
  rollback(_ctx, next) {
    return next()
  },
})
