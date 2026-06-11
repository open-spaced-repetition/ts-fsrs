import type { Grade } from '../../models.js'
import { defineMiddleware, type Middleware } from '../middleware.js'
import type {
  SchemaFragmentObject,
  StandardSchemaV1,
} from '../standard-schema.js'
import type {
  ReviewCard,
  ReviewContext,
  RollbackContext,
  SchedulerConfigInput,
  SchedulerMiddlewareConfig,
  SchedulerRevlog,
} from './context.js'
import {
  schedulerCoreFieldDefaults,
  schedulerCoreFieldSchema,
} from './context.js'
import { parseFragments } from './helper.js'
import type { SchedulerMiddleware } from './middleware.js'
import type { SchedulerModelDefinition } from './model.js'

/**
 * A reset-fragment contribution collected from a middleware (or the scheduler
 * core). Either a literal fragment, or a `(config) => fragment` factory resolved
 * once with the fixed config when the runner is built.
 */
export type ResetFragmentSource =
  | SchemaFragmentObject
  | ((config: never) => SchemaFragmentObject)

export interface SchedulerDescriptor<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
> {
  parseConfig(
    config: SchedulerConfigInput<Model, Middlewares>
  ): SchedulerMiddlewareConfig<Middlewares>
  parseCard(card: object): ReviewCard<Model, Middlewares>
  parseRevlog(card: object, rating: Grade): SchedulerRevlog<Model, Middlewares>
  resetFragments: ResetFragmentSource[]
  reviewHandlers: Middleware<ReviewContext<Model, Middlewares>>[]
  rollbackHandlers: Middleware<RollbackContext<Model, Middlewares>>[]
}

export function buildSchedulerDescriptor<
  const Model extends SchedulerModelDefinition,
  const Middlewares extends readonly SchedulerMiddleware[],
>(
  model: Model,
  middlewares: Middlewares
): SchedulerDescriptor<Model, Middlewares> {
  const configSchema: StandardSchemaV1[] = []
  const cardFieldsSchema: StandardSchemaV1[] = []
  const revlogFieldsSchema: StandardSchemaV1[] = []
  const resetFragments: ResetFragmentSource[] = []
  const reviewHandlers: Middleware<ReviewContext<Model, Middlewares>>[] = []
  const rollbackHandlers: Middleware<RollbackContext<Model, Middlewares>>[] = []

  for (const middleware of middlewares) {
    if (middleware.configSchema) {
      configSchema.push(middleware.configSchema)
    }

    const fieldsSchema = middleware.fieldsSchema
    if (fieldsSchema?.card) {
      cardFieldsSchema.push(fieldsSchema.card)
      revlogFieldsSchema.push(fieldsSchema.revlog ?? fieldsSchema.card)
    } else if (fieldsSchema?.revlog) {
      revlogFieldsSchema.push(fieldsSchema.revlog)
    }

    if (fieldsSchema?.default) {
      resetFragments.push(fieldsSchema.default)
    }

    const review = getReviewMiddleware<Model, Middlewares>(middleware)
    if (review) {
      reviewHandlers.push(defineMiddleware(review))
    }

    const rollback = getRollbackMiddleware<Model, Middlewares>(middleware)
    if (rollback) {
      rollbackHandlers.push(defineMiddleware(rollback))
    }
  }
  cardFieldsSchema.push(schedulerCoreFieldSchema, model.memoryStateSchema)
  revlogFieldsSchema.push(schedulerCoreFieldSchema, model.memoryStateSchema)
  resetFragments.push(schedulerCoreFieldDefaults)

  return {
    parseConfig: (config) => {
      const fragments = parseFragments(configSchema, config)

      return Object.assign(
        {},
        ...fragments
      ) as SchedulerMiddlewareConfig<Middlewares>
    },
    parseCard: (card) => {
      const fragments = parseFragments(cardFieldsSchema, card)

      return Object.assign({}, ...fragments) as ReviewCard<Model, Middlewares>
    },
    parseRevlog: (card, rating) => {
      const fragments = parseFragments(revlogFieldsSchema, card)

      return Object.assign({}, ...fragments, { rating }) as SchedulerRevlog<
        Model,
        Middlewares
      >
    },
    resetFragments,
    reviewHandlers,
    rollbackHandlers,
  }
}

function getReviewMiddleware<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
>(
  middleware: SchedulerMiddleware
): Middleware<ReviewContext<Model, Middlewares>> | undefined {
  return (
    middleware as {
      readonly review?: Middleware<ReviewContext<Model, Middlewares>>
    }
  ).review
}

function getRollbackMiddleware<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
>(
  middleware: SchedulerMiddleware
): Middleware<RollbackContext<Model, Middlewares>> | undefined {
  return (
    middleware as {
      readonly rollback?: Middleware<RollbackContext<Model, Middlewares>>
    }
  ).rollback
}
