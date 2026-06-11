import type { Middleware } from '../middleware.js'
import type {
  SchemaOutputOrEmpty,
  StandardSchemaV1Contract,
} from '../standard-schema.js'
import type {
  MiddlewareReviewContext,
  MiddlewareRollbackContext,
} from './context.js'
import type { SchedulerModelDefinition } from './model.js'

// biome-ignore lint/suspicious/noExplicitAny: bare SchedulerMiddleware means an arbitrary middleware; defineSchedulerMiddleware keeps precise schema inference.
type SchedulerMiddlewareSchema = StandardSchemaV1Contract<any, any>

export interface SchedulerFieldsSchema<
  ConfigSchema extends StandardSchemaV1Contract,
  CardFieldSchema extends StandardSchemaV1Contract,
  RevlogFieldSchema extends StandardSchemaV1Contract,
> {
  readonly card?: CardFieldSchema
  readonly revlog?: RevlogFieldSchema
  /**
   * Reset values for this middleware's card fields. Used by `scheduler.reset`
   * to restore declared fields; omitted fields are preserved as-is.
   *
   * Either a literal fragment, or a `(config) => fragment` factory when reset
   * values depend on resolved config.
   */
  readonly default?:
    | Partial<SchemaOutputOrEmpty<CardFieldSchema>>
    | ((
        config: SchemaOutputOrEmpty<ConfigSchema>
      ) => Partial<SchemaOutputOrEmpty<CardFieldSchema>>)
}

export interface SchedulerMiddleware<
  ConfigSchema extends StandardSchemaV1Contract = SchedulerMiddlewareSchema,
  CardFieldSchema extends StandardSchemaV1Contract = SchedulerMiddlewareSchema,
  RevlogFieldSchema extends StandardSchemaV1Contract = CardFieldSchema,
  StoreSchema extends StandardSchemaV1Contract = SchedulerMiddlewareSchema,
> {
  readonly configSchema?: ConfigSchema
  readonly fieldsSchema?: SchedulerFieldsSchema<
    ConfigSchema,
    CardFieldSchema,
    RevlogFieldSchema
  >
  readonly storeSchema?: StoreSchema
}

export type SchedulerMiddlewareDefinition<
  ConfigSchema extends StandardSchemaV1Contract = StandardSchemaV1Contract,
  CardFieldSchema extends StandardSchemaV1Contract = StandardSchemaV1Contract,
  RevlogFieldSchema extends StandardSchemaV1Contract = CardFieldSchema,
  StoreSchema extends StandardSchemaV1Contract = StandardSchemaV1Contract,
  Model extends SchedulerModelDefinition = SchedulerModelDefinition,
> = SchedulerMiddleware<
  ConfigSchema,
  CardFieldSchema,
  RevlogFieldSchema,
  StoreSchema
> & {
  readonly review?: Middleware<
    MiddlewareReviewContext<
      Model,
      ConfigSchema,
      CardFieldSchema,
      RevlogFieldSchema,
      StoreSchema
    >
  >
  readonly rollback?: Middleware<
    MiddlewareRollbackContext<
      Model,
      ConfigSchema,
      CardFieldSchema,
      RevlogFieldSchema,
      StoreSchema
    >
  >
}

export function defineSchedulerMiddleware<
  const ConfigSchema extends
    StandardSchemaV1Contract = StandardSchemaV1Contract,
  const CardFieldSchema extends
    StandardSchemaV1Contract = StandardSchemaV1Contract,
  const RevlogFieldSchema extends StandardSchemaV1Contract = CardFieldSchema,
  const StoreSchema extends StandardSchemaV1Contract = StandardSchemaV1Contract,
  const Model extends SchedulerModelDefinition = SchedulerModelDefinition,
>(
  middleware: SchedulerMiddlewareDefinition<
    ConfigSchema,
    CardFieldSchema,
    RevlogFieldSchema,
    StoreSchema,
    Model
  >
): SchedulerMiddlewareDefinition<
  ConfigSchema,
  CardFieldSchema,
  RevlogFieldSchema,
  StoreSchema,
  Model
> {
  return middleware
}

export function defineSchedulerMiddlewares<
  const Middlewares extends readonly SchedulerMiddleware[],
>(...middlewares: Middlewares): Middlewares {
  return middlewares
}
