import type { Middleware } from '../kit/middleware.js'
import type {
  MiddlewareReviewContext,
  MiddlewareReviewResult,
  MiddlewareRollbackContext,
  MiddlewareRollbackResult,
} from './context.js'
import type {
  SchemaOutputOrEmpty,
  StandardSchemaV1Contract,
} from './standard-schema.js'

export interface SchedulerMiddleware<
  ConfigSchema extends StandardSchemaV1Contract = StandardSchemaV1Contract,
  FieldSchema extends StandardSchemaV1Contract = StandardSchemaV1Contract,
  StoreSchema extends StandardSchemaV1Contract = StandardSchemaV1Contract,
> {
  readonly configSchema?: ConfigSchema
  readonly fieldSchema?: FieldSchema
  /**
   * Reset values for this middleware's own fields. Used by `scheduler.reset` to
   * restore the declared fields; any field omitted here is preserved as-is.
   *
   * Either a literal fragment, or a `(config) => fragment` factory when the
   * reset values depend on the resolved config. Factories are evaluated once,
   * when the scheduler is created (config already fixed), so reset stays
   * allocation-light at call time.
   */
  readonly fieldDefaults?:
    | Partial<SchemaOutputOrEmpty<FieldSchema>>
    | ((
        config: SchemaOutputOrEmpty<ConfigSchema>
      ) => Partial<SchemaOutputOrEmpty<FieldSchema>>)
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
