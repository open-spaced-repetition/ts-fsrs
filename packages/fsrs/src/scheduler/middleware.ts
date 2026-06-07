import type { Middleware } from '../kit/middleware.js'
import type {
  MiddlewareReviewContext,
  MiddlewareReviewResult,
  MiddlewareRollbackContext,
  MiddlewareRollbackResult,
} from './context.js'
import type { OptionalStandardSchema } from './standard-schema.js'

export type ReviewMiddleware<Context, Result> = Middleware<Context, Result>

export type RollbackMiddleware<Context, Result> = Middleware<Context, Result>

type SchedulerMiddlewareReview<
  ConfigSchema extends OptionalStandardSchema,
  FieldSchema extends OptionalStandardSchema,
  StoreSchema extends OptionalStandardSchema,
> = ReviewMiddleware<
  MiddlewareReviewContext<ConfigSchema, FieldSchema, StoreSchema>,
  MiddlewareReviewResult<FieldSchema>
>

type SchedulerMiddlewareRollback<
  ConfigSchema extends OptionalStandardSchema,
  FieldSchema extends OptionalStandardSchema,
  StoreSchema extends OptionalStandardSchema,
> = RollbackMiddleware<
  MiddlewareRollbackContext<ConfigSchema, FieldSchema, StoreSchema>,
  MiddlewareRollbackResult<FieldSchema>
>

export interface SchedulerMiddleware<
  ConfigSchema extends OptionalStandardSchema = OptionalStandardSchema,
  FieldSchema extends OptionalStandardSchema = OptionalStandardSchema,
  StoreSchema extends OptionalStandardSchema = OptionalStandardSchema,
> {
  readonly configSchema?: ConfigSchema
  readonly fieldSchema?: FieldSchema
  readonly storeSchema?: StoreSchema
  readonly review?: SchedulerMiddlewareReview<
    ConfigSchema,
    FieldSchema,
    StoreSchema
  >
  readonly rollback?: SchedulerMiddlewareRollback<
    ConfigSchema,
    FieldSchema,
    StoreSchema
  >
}

export function defineSchedulerMiddleware<
  const ConfigSchema extends OptionalStandardSchema = undefined,
  const FieldSchema extends OptionalStandardSchema = undefined,
  const StoreSchema extends OptionalStandardSchema = undefined,
>(
  middleware: SchedulerMiddleware<ConfigSchema, FieldSchema, StoreSchema>
): SchedulerMiddleware<ConfigSchema, FieldSchema, StoreSchema> {
  return middleware
}

export function defineSchedulerMiddlewares<
  const Middlewares extends readonly SchedulerMiddleware[],
>(...middlewares: Middlewares): Middlewares {
  return middlewares
}
