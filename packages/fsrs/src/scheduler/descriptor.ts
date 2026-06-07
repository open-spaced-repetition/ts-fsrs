import type {
  ReviewCard,
  ReviewContext,
  ReviewResult,
  RollbackContext,
  SchedulerConfigInput,
  SchedulerMiddlewareConfig,
} from './context.js'
import { schedulerCoreFieldSchema } from './context.js'
import { parseFragments } from './helper.js'
import type {
  ReviewMiddleware,
  RollbackMiddleware,
  SchedulerMiddleware,
} from './middleware.js'
import type { SchedulerModelFactory } from './model.js'
import type { StandardSchemaV1 } from './standard-schema.js'

export interface SchedulerDescriptor<
  Model extends SchedulerModelFactory,
  Middlewares extends readonly SchedulerMiddleware[],
> {
  parseConfig(
    config: SchedulerConfigInput<Model, Middlewares>
  ): SchedulerMiddlewareConfig<Middlewares>
  parseCard(card: object): ReviewCard<Model, Middlewares>
  reviewHandlers: ReviewMiddleware<
    ReviewContext<Model, Middlewares>,
    ReviewResult<Model, Middlewares>
  >[]
  rollbackHandlers: RollbackMiddleware<
    RollbackContext<Model, Middlewares>,
    ReviewCard<Model, Middlewares>
  >[]
}

export function buildSchedulerDescriptor<
  const Model extends SchedulerModelFactory,
  const Middlewares extends readonly SchedulerMiddleware[],
>(
  model: Model,
  middlewares: Middlewares
): SchedulerDescriptor<Model, Middlewares> {
  const configSchema: StandardSchemaV1[] = []
  const fieldsSchema: StandardSchemaV1[] = []
  const reviewHandlers: ReviewMiddleware<
    ReviewContext<Model, Middlewares>,
    ReviewResult<Model, Middlewares>
  >[] = []
  const rollbackHandlers: RollbackMiddleware<
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
      reviewHandlers.push((ctx, next) => {
        return review(ctx, next) as ReviewResult<Model, Middlewares>
      })
    }

    const rollback = middleware.rollback
    if (rollback) {
      rollbackHandlers.push((ctx, next) => {
        return rollback(ctx, next) as ReviewCard<Model, Middlewares>
      })
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
    reviewHandlers,
    rollbackHandlers,
  }
}
