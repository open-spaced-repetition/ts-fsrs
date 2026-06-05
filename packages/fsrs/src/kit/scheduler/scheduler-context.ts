import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Grade, State } from '../../models.js'
import type { Prettify, SchemaInput, SchemaOutput } from '../helper-types.js'
import type { IFSRSModel } from '../types.js'
import type { SchedulerMiddleware } from './scheduler-middleware.js'

type MiddlewareConfig<M extends SchedulerMiddleware> = [
  NonNullable<M['configSchema']>,
] extends [never]
  ? unknown
  : NonNullable<M['configSchema']> extends StandardSchemaV1
    ? SchemaOutput<NonNullable<M['configSchema']>>
    : unknown

/**
 * Intersection of every mounted middleware's `configSchema` output, folded over
 * the tuple so each contributor's keys compose. Intersecting directly (rather
 * than collapsing a union) keeps `unknown` neutral and never drops a concrete
 * contributor that sits next to a loosely-typed one.
 */
export type MergeMiddlewareConfigs<
  Middlewares extends readonly SchedulerMiddleware[],
> = Middlewares extends readonly [infer Head, ...infer Tail]
  ? Head extends SchedulerMiddleware
    ? Tail extends readonly SchedulerMiddleware[]
      ? MiddlewareConfig<Head> & MergeMiddlewareConfigs<Tail>
      : MiddlewareConfig<Head>
    : unknown
  : unknown

/**
 * Fully merged, validated scheduler config — DERIVED from the model schema plus
 * every mounted middleware's `configSchema`, never hard-coded, so callers get
 * real type inference: `scheduler(model, { middlewares: [mw] }).config` carries
 * `mw`'s config keys, and the model's own config keys flow through too.
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
  StandardSchemaV1.InferOutput<Model['~configSchema']> &
    MergeMiddlewareConfigs<Middlewares>
>

export type Card<MemoryState, Fields = unknown> = Prettify<MemoryState & Fields>

export type RevlogStats = {
  state: State
  rating: Grade
  reps: number
  lapses: number
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
  readonly rating: Grade
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
  readonly card: Card<MemoryState, SchemaOutput<Fields>>
  readonly log: Revlog<MemoryState, SchemaOutput<Fields>, Input>
}

export type SchedulerRollbackResult<
  MemoryState,
  Fields extends StandardSchemaV1 = StandardSchemaV1,
  Input extends SchedulerInput<MemoryState, Fields> = SchedulerInput<
    MemoryState,
    Fields
  >,
> = Prettify<
  Omit<Input, 'card'> & {
    readonly card: Card<MemoryState, SchemaOutput<Fields>>
  }
>

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

  readonly result: SchedulerResult<MemoryState, Fields, Input>
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
  readonly input: SchedulerResult<MemoryState, Fields, ReviewInput>
  readonly config: SchemaOutput<Config>
  readonly result: SchedulerRollbackResult<MemoryState, Fields, ReviewInput>
}
