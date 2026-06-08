import type { Middleware } from '../kit/middleware.js'
import type {
  MiddlewareReviewContext,
  MiddlewareReviewResult,
  MiddlewareRollbackContext,
  MiddlewareRollbackResult,
} from './context.js'
import type { StandardSchemaV1Contract } from './standard-schema.js'

export interface SchedulerMiddleware<
  ConfigSchema extends StandardSchemaV1Contract = StandardSchemaV1Contract,
  FieldSchema extends StandardSchemaV1Contract = StandardSchemaV1Contract,
  StoreSchema extends StandardSchemaV1Contract = StandardSchemaV1Contract,
> {
  readonly configSchema?: ConfigSchema
  readonly fieldSchema?: FieldSchema
  readonly storeSchema?: StoreSchema
  readonly review?: Middleware<
    MiddlewareReviewContext<ConfigSchema, FieldSchema, StoreSchema>,
    MiddlewareReviewResult<FieldSchema>
  >
  readonly rollback?: Middleware<
    MiddlewareRollbackContext<ConfigSchema, FieldSchema, StoreSchema>,
    MiddlewareRollbackResult<FieldSchema>
  >
}

export function defineSchedulerMiddleware<
  const ConfigSchema extends
    StandardSchemaV1Contract = StandardSchemaV1Contract,
  const FieldSchema extends StandardSchemaV1Contract = StandardSchemaV1Contract,
  const StoreSchema extends StandardSchemaV1Contract = StandardSchemaV1Contract,
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
