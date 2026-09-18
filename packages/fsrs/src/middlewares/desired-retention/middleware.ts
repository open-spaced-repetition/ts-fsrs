import {
  defineMiddleware,
  grades,
  type ReviewCandidateContext,
} from '@open-spaced-repetition/srs-kit'
import { desiredRetentionConfigSchema } from './schema.js'

const retentionInjectedSymbol = Symbol('ts-fsrs.desired-retention.injected')
type RetentionCandidate = ReviewCandidateContext & {
  [retentionInjectedSymbol]?: true
}

export const schedulerDesiredRetentionMiddleware = defineMiddleware({
  name: Symbol('ts-fsrs.desired-retention'),
  schema: { config: desiredRetentionConfigSchema },
  handlers: {
    nextInterval(ctx, next) {
      const candidate = ctx.candidate as RetentionCandidate
      if (
        ctx.input.desiredRetention === undefined &&
        !candidate[retentionInjectedSymbol]
      ) {
        for (const grade of grades) {
          candidate.desiredRetention[grade] = ctx.config.desiredRetention[grade]
        }
        candidate[retentionInjectedSymbol] = true
      }
      next()
    },
  },
})
