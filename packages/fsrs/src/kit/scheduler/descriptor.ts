import { defineMiddleware, type Middleware } from '../middleware.js'
import type {
  ReviewCard,
  ReviewContext,
  ReviewResult,
  RollbackContext,
  SchedulerConfigInput,
  SchedulerMiddlewareConfig,
} from './context.js'
import {
  schedulerCoreFieldDefaults,
  schedulerCoreFieldSchema,
} from './context.js'
import { parseFragments } from './helper.js'
import type { SchedulerMiddleware } from './middleware.js'
import type { SchedulerModelDefinition } from './model.js'
import type {
  SchemaFragmentObject,
  StandardSchemaV1,
} from './standard-schema.js'

/**
 * A reset-fragment contribution collected from a middleware (or the scheduler
 * core). Either a literal fragment, or a `(config) => fragment` factory resolved
 * once with the fixed config when the runner is built.
 */
export type ResetFragmentSource =
  | SchemaFragmentObject
  | ((config: object) => SchemaFragmentObject)

export interface SchedulerDescriptor<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
> {
  parseConfig(
    config: SchedulerConfigInput<Model, Middlewares>
  ): SchedulerMiddlewareConfig<Middlewares>
  parseCard(card: object): ReviewCard<Model, Middlewares>
  fieldDefaults: ResetFragmentSource[]
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
  const fieldDefaults: ResetFragmentSource[] = []
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

    if (middleware.fieldDefaults) {
      fieldDefaults.push(middleware.fieldDefaults)
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
  fieldDefaults.push(schedulerCoreFieldDefaults)

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
    fieldDefaults,
    reviewHandlers,
    rollbackHandlers,
  }
}
