import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Middleware } from '../middleware.js'
import type { IFSRSModel } from '../types.js'
import type {
  ReviewContext,
  RollbackContext,
  SchedulerInput,
} from './scheduler-context.js'

type ModelMemoryState<Model extends IFSRSModel> = ReturnType<Model['step']>

export type ReviewMiddlewareFn<
  MemoryState = unknown,
  ConfigSchema extends StandardSchemaV1 = StandardSchemaV1,
  FieldSchema extends StandardSchemaV1 = StandardSchemaV1,
  Input extends SchedulerInput<MemoryState, FieldSchema> = SchedulerInput<
    MemoryState,
    FieldSchema
  >,
> = Middleware<
  ReviewContext<MemoryState, FieldSchema, ConfigSchema, Input>,
  void
>

export type RollbackMiddlewareFn<
  MemoryState = unknown,
  ConfigSchema extends StandardSchemaV1 = StandardSchemaV1,
  FieldSchema extends StandardSchemaV1 = StandardSchemaV1,
  Input extends SchedulerInput<MemoryState, FieldSchema> = SchedulerInput<
    MemoryState,
    FieldSchema
  >,
> = Middleware<
  RollbackContext<MemoryState, FieldSchema, ConfigSchema, Input>,
  void
>

/**
 * A scheduler middleware bundles its review and rollback handlers together with
 * its optional schema slots, so one unit (e.g. a future seed/fuzz/learning-steps
 * strategy) owns both lifecycle phases and its own config. Both lifecycle
 * handlers are required; schema slots stay optional.
 *
 * Generic over its own `configSchema`/`fieldSchema`: the handlers' `ctx.config`
 * gains the config keys, and scheduler cards under `ctx.input`/`ctx.result`
 * gain the fields this middleware declares. The schema slots are authored
 * internally with `zod/mini` but typed as the vendor-neutral `StandardSchemaV1`
 * — composition happens via
 * fragment-parse (`.validate()` only), never through zod-specific `.merge()`.
 *
 * Internal to v6 (not exported from the package root).
 */
export interface SchedulerMiddleware<
  MemoryState = unknown,
  ConfigSchema extends StandardSchemaV1 = StandardSchemaV1,
  FieldSchema extends StandardSchemaV1 = StandardSchemaV1,
> {
  reviewHandler(
    ...args: Parameters<
      ReviewMiddlewareFn<MemoryState, ConfigSchema, FieldSchema>
    >
  ): void
  rollbackHandler(
    ...args: Parameters<
      RollbackMiddlewareFn<MemoryState, ConfigSchema, FieldSchema>
    >
  ): void
  // Merged into the scheduler config (see buildSchedulerConfig).
  readonly configSchema?: ConfigSchema
  // Extra per-review card input/output fields. Unused by the v6 core.
  readonly fieldSchema?: FieldSchema
}

export function defineSchedulerMiddleware<
  MemoryState = unknown,
  const ConfigSchema extends StandardSchemaV1 = StandardSchemaV1,
  const FieldSchema extends StandardSchemaV1 = StandardSchemaV1,
>(
  middleware: SchedulerMiddleware<MemoryState, ConfigSchema, FieldSchema>
): SchedulerMiddleware<MemoryState, ConfigSchema, FieldSchema>

export function defineSchedulerMiddleware<
  const Model extends IFSRSModel,
  const ConfigSchema extends StandardSchemaV1 = StandardSchemaV1,
  const FieldSchema extends StandardSchemaV1 = StandardSchemaV1,
>(
  model: Model,
  middleware: SchedulerMiddleware<
    ModelMemoryState<Model>,
    ConfigSchema,
    FieldSchema
  >
): SchedulerMiddleware<ModelMemoryState<Model>, ConfigSchema, FieldSchema>

export function defineSchedulerMiddleware(
  ...args:
    | [middleware: SchedulerMiddleware]
    | [model: IFSRSModel, middleware: SchedulerMiddleware]
): SchedulerMiddleware {
  return args.length === 1 ? args[0] : args[1]
}
