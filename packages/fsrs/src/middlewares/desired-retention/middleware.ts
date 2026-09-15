import { defineMiddleware } from '@open-spaced-repetition/srs-kit'
import { desiredRetentionConfigSchema } from './schema.js'

export const schedulerDesiredRetentionMiddleware = defineMiddleware({
  name: Symbol('ts-fsrs.desired-retention'),
  schema: { config: desiredRetentionConfigSchema },
  handlers: {
    nextInterval(ctx, next) {
      if (ctx.input.desiredRetention === undefined) {
        ctx.candidate.desiredRetention = ctx.config.desiredRetention
      }
      next()
    },
  },
})
