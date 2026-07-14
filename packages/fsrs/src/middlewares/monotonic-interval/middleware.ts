import {
  defineMiddleware,
  type Grade,
  Rating,
} from '@open-spaced-repetition/srs-kit'
import { calculateScheduleDay, type IntervalCandidates } from './core.js'
import { monotonicIntervalConfigSchema } from './schema.js'

/** Register after fuzzing, when present, and before learning steps. */
export const schedulerMonotonicIntervalMiddleware = defineMiddleware({
  name: Symbol('ts-fsrs.monotonic-interval'),
  schema: {
    config: monotonicIntervalConfigSchema,
  },
  handlers: {
    review(ctx, next) {
      const { grade } = ctx.input
      const interval = (rating: Grade): number =>
        ctx.candidate.nextInterval(
          ctx.candidate.step(rating),
          ctx.desiredRetention
        )
      const schedule = (...candidates: IntervalCandidates): number =>
        calculateScheduleDay(candidates, ctx.config.maximumInterval)

      switch (grade) {
        case Rating.Again:
          ctx.scheduledDays = schedule(interval(Rating.Again))
          break
        case Rating.Hard:
          ctx.scheduledDays = schedule(
            interval(Rating.Again),
            interval(Rating.Hard)
          )
          break
        case Rating.Good:
          ctx.scheduledDays = schedule(
            interval(Rating.Again),
            interval(Rating.Hard),
            interval(Rating.Good)
          )
          break
        case Rating.Easy:
          ctx.scheduledDays = schedule(
            interval(Rating.Again),
            interval(Rating.Hard),
            interval(Rating.Good),
            interval(Rating.Easy)
          )
          break
      }

      next()
    },
  },
})
