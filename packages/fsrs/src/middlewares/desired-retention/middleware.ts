import {
  defaultRatingScale,
  defineMiddleware,
  type RatingScale,
  type ReviewCandidateContext,
} from '@open-spaced-repetition/srs-kit'
import { createDesiredRetentionConfigSchema } from './schema.js'

const retentionInjectedSymbol = Symbol('ts-fsrs.desired-retention.injected')
type RetentionCandidate = ReviewCandidateContext<number> & {
  [retentionInjectedSymbol]?: true
}

export function createSchedulerDesiredRetentionMiddleware<
  const Scale extends RatingScale,
>(scale: Scale) {
  return defineMiddleware({
    name: Symbol('ts-fsrs.desired-retention'),
    schema: { config: createDesiredRetentionConfigSchema(scale) },
    handlers: {
      nextInterval(ctx, next) {
        const candidate = ctx.candidate as RetentionCandidate
        if (
          ctx.input.desiredRetention === undefined &&
          !candidate[retentionInjectedSymbol]
        ) {
          const desiredRetention: Partial<Record<number, number>> =
            ctx.config.desiredRetention
          for (const grade of ctx.instance.ratings.grades) {
            // Grades outside this middleware's scale keep the scheduler default.
            candidate.desiredRetention[grade] =
              desiredRetention[grade] ?? candidate.desiredRetention[grade]
          }
          candidate[retentionInjectedSymbol] = true
        }
        next()
      },
    },
  })
}

export const schedulerDesiredRetentionMiddleware =
  createSchedulerDesiredRetentionMiddleware(defaultRatingScale)
