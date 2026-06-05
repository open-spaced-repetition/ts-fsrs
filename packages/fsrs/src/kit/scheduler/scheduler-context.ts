import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Grade, Rating, State } from '../../models.js'
import type { Prettify, SchemaInput, SchemaOutput } from '../helper-types.js'
import type { IFSRSModel } from '../types.js'
import type { SchedulerMiddleware } from './scheduler-middleware.js'

type SchemaFragment<Schema, Kind extends 'input' | 'output'> = [
  NonNullable<Schema>,
] extends [never]
  ? unknown
  : NonNullable<Schema> extends StandardSchemaV1
    ? Kind extends 'input'
      ? SchemaInput<NonNullable<Schema>>
      : SchemaOutput<NonNullable<Schema>>
    : unknown

type MergeMiddlewareFragments<
  Middlewares extends readonly SchedulerMiddleware[],
  Key extends 'configSchema' | 'fieldSchema',
  Kind extends 'input' | 'output',
> = Middlewares extends readonly [infer Head, ...infer Tail]
  ? Head extends SchedulerMiddleware
    ? Tail extends readonly SchedulerMiddleware[]
      ? SchemaFragment<Head[Key], Kind> &
          MergeMiddlewareFragments<Tail, Key, Kind>
      : SchemaFragment<Head[Key], Kind>
    : unknown
  : unknown

/**
 * Fully merged, validated scheduler config — DERIVED from the model schema plus
 * every mounted middleware's `configSchema`, never hard-coded, so callers get
 * real type inference: `Scheduler({ Model, middlewares: [mw], config })`
 * carries `mw`'s config keys, and the model's own config keys flow through too.
 *
 * Runtime merge order is "later contributor wins" (see `buildSchedulerConfig`);
 * at the type level colliding keys intersect, which is exact when keys are
 * disjoint (the normal case).
 */
export type SchedulerConfig<
  Model extends IFSRSModel = IFSRSModel,
  Middlewares extends
    readonly SchedulerMiddleware[] = readonly SchedulerMiddleware[],
> = Prettify<
  SchemaOutput<Model['~configSchema']> &
    MergeMiddlewareFragments<Middlewares, 'configSchema', 'output'>
>

export type ModelMemoryState<Model extends IFSRSModel> = ReturnType<
  Model['step']
>

export type SchedulerConfigInput<
  ModelConfig,
  Middlewares extends
    readonly SchedulerMiddleware[] = readonly SchedulerMiddleware[],
> = Prettify<
  ModelConfig & MergeMiddlewareFragments<Middlewares, 'configSchema', 'input'>
>

export type Card<MemoryState, Fields = unknown> = Prettify<MemoryState & Fields>

export type RevlogStats = {
  state: State
  rating: Grade
  reps: number
  lapses: number
}

export type SchedulerInterval = {
  interval: number
}

type RevlogDuration<Input> = Input extends { readonly durationMs: number }
  ? { durationMs: number }
  : { durationMs?: number }

export type Revlog<MemoryState, Fields = unknown, Input = unknown> = Prettify<
  MemoryState & Fields & RevlogStats & RevlogDuration<Input>
>

export type SchedulerInput<
  MemoryState,
  Fields extends StandardSchemaV1 = StandardSchemaV1,
> = {
  readonly card: Card<MemoryState, SchemaInput<Fields>>
  readonly rating: Rating
  readonly elapsedDays: number
  readonly durationMs?: number
}

export type SchedulerResult<
  MemoryState,
  Fields extends StandardSchemaV1 = StandardSchemaV1,
  Input extends SchedulerInput<MemoryState, Fields> = SchedulerInput<
    MemoryState,
    Fields
  >,
> = {
  readonly card: Card<MemoryState, SchemaOutput<Fields> & SchedulerInterval>
  readonly log: Revlog<
    MemoryState,
    SchemaOutput<Fields> & SchedulerInterval,
    Input
  >
}

export type SchedulerRollbackInput<
  MemoryState,
  Fields extends StandardSchemaV1 = StandardSchemaV1,
  ReviewInput extends SchedulerInput<MemoryState, Fields> = SchedulerInput<
    MemoryState,
    Fields
  >,
> = {
  readonly card: Card<MemoryState, SchemaOutput<Fields> & SchedulerInterval>
  readonly revlog: Revlog<
    MemoryState,
    SchemaOutput<Fields> & SchedulerInterval,
    ReviewInput
  >
}

export type SchedulerMiddlewareInput<
  MemoryState,
  Middlewares extends
    readonly SchedulerMiddleware[] = readonly SchedulerMiddleware[],
> = {
  readonly card: Card<
    MemoryState,
    MergeMiddlewareFragments<Middlewares, 'fieldSchema', 'input'>
  >
  readonly rating: Rating
  readonly elapsedDays: number
  readonly durationMs?: number
}

export type SchedulerMiddlewareResult<
  MemoryState,
  Middlewares extends
    readonly SchedulerMiddleware[] = readonly SchedulerMiddleware[],
  Input extends SchedulerMiddlewareInput<
    MemoryState,
    Middlewares
  > = SchedulerMiddlewareInput<MemoryState, Middlewares>,
> = {
  readonly card: Card<
    MemoryState,
    MergeMiddlewareFragments<Middlewares, 'fieldSchema', 'output'> &
      SchedulerInterval
  >
  readonly log: Revlog<
    MemoryState,
    MergeMiddlewareFragments<Middlewares, 'fieldSchema', 'output'> &
      SchedulerInterval,
    Input
  >
}

export type SchedulerContext<
  MemoryState,
  Fields extends StandardSchemaV1 = StandardSchemaV1,
  // Stores extends StandardSchemaV1 = StandardSchemaV1,
  Config extends StandardSchemaV1 = StandardSchemaV1,
  Input extends SchedulerInput<MemoryState, Fields> = SchedulerInput<
    MemoryState,
    Fields
  >,
> = {
  readonly input: Input
  readonly config: SchemaOutput<Config>

  // readonly store: SchemaOutput<Stores>

  result?: SchedulerResult<MemoryState, Fields, Input>
}

export type ReviewContext<
  MemoryState,
  Fields extends StandardSchemaV1 = StandardSchemaV1,
  Config extends StandardSchemaV1 = StandardSchemaV1,
  Input extends SchedulerInput<MemoryState, Fields> = SchedulerInput<
    MemoryState,
    Fields
  >,
> = SchedulerContext<MemoryState, Fields, Config, Input>

export type RollbackContext<
  MemoryState,
  Fields extends StandardSchemaV1 = StandardSchemaV1,
  Config extends StandardSchemaV1 = StandardSchemaV1,
  ReviewInput extends SchedulerInput<MemoryState, Fields> = SchedulerInput<
    MemoryState,
    Fields
  >,
> = {
  readonly input: SchedulerRollbackInput<MemoryState, Fields, ReviewInput>
  readonly config: SchemaOutput<Config>
  result?: SchedulerResult<MemoryState, Fields, ReviewInput>['card']
}
