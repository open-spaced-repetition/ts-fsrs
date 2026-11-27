import {
  defineMiddleware,
  desiredRetentionSchema,
  parse,
  type ReviewCandidateContext,
} from '@open-spaced-repetition/srs-kit'
import { calculateScheduleDay } from './core.js'
import { monotonicIntervalConfigSchema } from './schema.js'

/** Register after fuzzing and learning steps, when present. */
export const schedulerMonotonicIntervalMiddleware = defineMiddleware({
  name: Symbol('ts-fsrs.monotonic-interval'),
  schema: {
    config: monotonicIntervalConfigSchema,
  },
  handlers: {
    nextInterval(ctx, next) {
      next()

      const { grade } = ctx.input
      const { grades, isLapse } = ctx.instance.ratings
      // The scheduler's grades may lie outside the default `Grade` union.
      const candidate = ctx.candidate as ReviewCandidateContext<number>
      const intervalOf = (rating: number): number =>
        candidate.nextInterval(
          candidate.step(rating),
          parse(desiredRetentionSchema, candidate.desiredRetention[rating])
        )
      // The intervals of every lower grade in ascending order, then this one.
      const candidates: number[] = []
      for (const lower of grades) {
        if (lower === grade) break
        candidates.push(intervalOf(lower))
      }
      candidates.push(ctx.scheduledDays!)
      ctx.scheduledDays = calculateScheduleDay(
        candidates,
        ctx.config.maximumInterval,
        // Lapse grades sort first, so this counts every lapse grade.
        grades.findIndex((lower) => !isLapse(lower))
      )
    },
  },
})
