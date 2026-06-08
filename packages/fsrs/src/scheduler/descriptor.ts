import { defineMiddleware, type Middleware } from '../kit/middleware.js'
import type {
  ReviewCard,
  ReviewContext,
  ReviewResult,
  RollbackContext,
  SchedulerConfigInput,
  SchedulerMiddlewareConfig,
} from './context.js'
import { schedulerCoreFieldSchema } from './context.js'
import { parseDefaultFragments, parseFragments } from './helper.js'
import type { SchedulerMiddleware } from './middleware.js'
import type { SchedulerModelDefinition } from './model.js'
import type { StandardSchemaV1 } from './standard-schema.js'

export interface SchedulerDescriptor<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
> {
  parseConfig(
    config: SchedulerConfigInput<Model, Middlewares>
  ): SchedulerMiddlewareConfig<Middlewares>
  parseCard(card: object): ReviewCard<Model, Middlewares>
  resetCard(card: object): ReviewCard<Model, Middlewares>
  reviewHandlers: Middleware<
    ReviewContext<Model, Middlewares>,
    ReviewResult<Model, Middlewares>
  >[]
  rollbackHandlers: Middleware<
    RollbackContext<Model, Middlewares>,
    ReviewCard<Model, Middlewares>
  >[]
}

export function buildSchedulerDescriptor<
  const Model extends SchedulerModelDefinition,
  const Middlewares extends readonly SchedulerMiddleware[],
>(
  model: Model,
  middlewares: Middlewares
): SchedulerDescriptor<Model, Middlewares> {
  const configSchema: StandardSchemaV1[] = []
  const fieldsSchema: StandardSchemaV1[] = []
  const reviewHandlers: Middleware<
    ReviewContext<Model, Middlewares>,
    ReviewResult<Model, Middlewares>
  >[] = []
  const rollbackHandlers: Middleware<
    RollbackContext<Model, Middlewares>,
    ReviewCard<Model, Middlewares>
  >[] = []

  for (const middleware of middlewares) {
    if (middleware.configSchema) {
      configSchema.push(middleware.configSchema)
    }

    if (middleware.fieldSchema) {
      fieldsSchema.push(middleware.fieldSchema)
    }

    const review = middleware.review
    if (review) {
      reviewHandlers.push(defineMiddleware(review))
    }

    const rollback = middleware.rollback
    if (rollback) {
      rollbackHandlers.push(defineMiddleware(rollback))
    }
  }
  fieldsSchema.push(schedulerCoreFieldSchema, model.memoryStateSchema)

  return {
    parseConfig: (config) => {
      const fragments = parseFragments(configSchema, config)

      return Object.assign(
        {},
        ...fragments
      ) as SchedulerMiddlewareConfig<Middlewares>
    },
    parseCard: (card) => {
      const fragments = parseFragments(fieldsSchema, card)

      return Object.assign({}, ...fragments) as ReviewCard<Model, Middlewares>
    },
    resetCard: (card) => {
      const parsedCard = Object.assign(
        {},
        ...parseFragments(fieldsSchema, card)
      ) as ReviewCard<Model, Middlewares>
      const defaults = parseDefaultFragments(fieldsSchema, parsedCard)

      return Object.assign({}, parsedCard, ...defaults) as ReviewCard<
        Model,
        Middlewares
      >
    },
    reviewHandlers,
    rollbackHandlers,
  }
}
