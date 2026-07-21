/** biome-ignore-all lint/suspicious/noExplicitAny: type-level widening for AnyScheduler */

import type { AnyChrono, AnyChronoCore } from '@/chrono/chrono.js'
import type { AnyMiddleware } from '@/middleware/index.js'
import type { AnyModel, AnyModelCore } from '@/model/model.js'
import type { Grade } from '@/primitives/rating.js'
import type {
  AnyObjectSchema,
  AnySchema,
  Assign,
  EmptyPart,
  Mutable,
  Prettify,
  SchemaInput,
  SchemaOutput,
  SRSSchema,
} from '@/schema/index.js'
import type {
  SchedulerCoreFields,
  SchedulerRevlogCoreFields,
} from './fields.js'
import type { ExtendSchedulerEnv } from './infer.js'

// ==========
// Schedule Result
// ==========

export interface ScheduleResult<Card, Revlog> {
  card: Mutable<Card>
  revlog: Mutable<Revlog>
}

export interface PreviewItem<Card, Revlog>
  extends ScheduleResult<Card, Revlog> {
  readonly grade: Grade
}

export interface PreviewResult<Card, Revlog> {
  [Symbol.iterator](): IterableIterator<PreviewItem<Card, Revlog>>
}

// ==========
// Scheduler Core
// ==========

export type BlankSchedulerCoreEnv = {
  readonly config: object
  readonly cardInitInput?: object
  readonly card: {
    readonly input: object
    readonly output: object
  }
  readonly revlog: {
    readonly input: object
    readonly output: object
  }
  readonly chrono: unknown
  readonly scheduleStatus: string
}

type SchedulerCoreCardInitInput<Env extends BlankSchedulerCoreEnv> =
  Env extends {
    readonly cardInitInput: infer Input extends object
  }
    ? Input
    : { readonly now?: Env['chrono'] }

export type SchedulerNewCardOptions<Env extends BlankSchedulerCoreEnv> =
  Prettify<SchedulerCoreCardInitInput<Env>>

export type SchedulerNewCardFn<Env extends BlankSchedulerCoreEnv> =
  EmptyPart extends SchedulerNewCardOptions<Env>
    ? (options?: SchedulerNewCardOptions<Env>) => Env['card']['output']
    : (options: SchedulerNewCardOptions<Env>) => Env['card']['output']

export interface SchedulerCore<
  Env extends BlankSchedulerCoreEnv = BlankSchedulerCoreEnv,
  M extends AnyModelCore = AnyModelCore,
  C extends AnyChronoCore = AnyChronoCore,
> {
  readonly model: M
  readonly chrono: C
  readonly config: Readonly<Env['config']>
  readonly newCard: SchedulerNewCardFn<Env>
  readonly forget: (input: {
    readonly card: Env['card']['input']
    readonly now?: Env['chrono']
  }) => Env['card']['output']
  readonly review: (input: {
    readonly card: Env['card']['input']
    readonly grade: Grade
    readonly now?: Env['chrono']
  }) => ScheduleResult<Env['card']['output'], Env['revlog']['output']>
  readonly preview: (input: {
    readonly card: Env['card']['input']
    readonly now?: Env['chrono']
  }) => PreviewResult<Env['card']['output'], Env['revlog']['output']>
  readonly rollback: (input: {
    readonly card: Env['card']['output']
    readonly revlog: Env['revlog']['output']
  }) => Env['card']['output']
}

export type AnySchedulerCore = SchedulerCore<any>

// ==========
// Scheduler
// ==========

export type SchedulerCardInitSchema<
  Time,
  Input extends object = EmptyPart,
  Output extends object = EmptyPart,
> = SRSSchema<{
  input: Prettify<Assign<Input, { readonly now?: Time }>>
  output: {
    readonly input: Output
    readonly now?: unknown
  }
}>

export type BlankSchedulerEnv = {
  readonly chrono: unknown
  readonly config: AnySchema
  readonly cardInitInput: SRSSchema<{
    input: object
    output: {
      readonly input: object
      readonly now?: unknown
    }
  }>
  readonly card: AnyObjectSchema
  readonly revlog: AnyObjectSchema
  readonly scheduleStatus: string
}

type SchedulerCoreFieldSchemaPartFields<
  Env extends BlankSchedulerEnv,
  Key extends 'card' | 'revlog',
  Direction extends 'input' | 'output',
> = Prettify<
  Assign<
    Direction extends 'input' ? SchemaInput<Env[Key]> : SchemaOutput<Env[Key]>,
    Key extends 'card'
      ? SchedulerCoreFields<Env['scheduleStatus']>
      : SchedulerRevlogCoreFields<Env['scheduleStatus']>
  >
>

type SchedulerCoreFieldSchemaPart<
  Env extends BlankSchedulerEnv,
  Key extends 'card' | 'revlog',
  Direction extends 'input' | 'output',
> = Prettify<
  Direction extends 'input'
    ? Readonly<SchedulerCoreFieldSchemaPartFields<Env, Key, Direction>>
    : Mutable<SchedulerCoreFieldSchemaPartFields<Env, Key, Direction>>
>

export interface SchedulerSchema<
  Env extends BlankSchedulerEnv = BlankSchedulerEnv,
> {
  readonly config: Env['config']
  readonly cardInitInput: Env['cardInitInput']
  readonly card: Env['card']
  readonly revlog: Env['revlog']
  readonly scheduleStatus: SRSSchema<{
    input: Env['scheduleStatus']
    output: Env['scheduleStatus']
  }>
}

export type SchedulerUseFn<
  Name extends string | symbol,
  Env extends BlankSchedulerEnv,
  M extends AnyModel = AnyModel,
  C extends AnyChrono = AnyChrono,
> = <const AddedMWs extends readonly AnyMiddleware[]>(
  ...middlewares: AddedMWs
) => ComposableScheduler<
  Name,
  Prettify<ExtendSchedulerEnv<Env, AddedMWs>>,
  M,
  C
>

export type SchedulerCoreEnv<Env extends BlankSchedulerEnv> = {
  readonly config: SchemaOutput<Env['config']>
  readonly cardInitInput: SchemaInput<Env['cardInitInput']>
  readonly card: {
    readonly input: SchedulerCoreFieldSchemaPart<Env, 'card', 'input'>
    readonly output: SchedulerCoreFieldSchemaPart<Env, 'card', 'output'>
  }
  readonly revlog: {
    readonly input: SchedulerCoreFieldSchemaPart<Env, 'revlog', 'input'>
    readonly output: SchedulerCoreFieldSchemaPart<Env, 'revlog', 'output'>
  }
  readonly chrono: Env['chrono']
  readonly scheduleStatus: Env['scheduleStatus']
}

export type SchedulerCreate<
  Env extends BlankSchedulerEnv = BlankSchedulerEnv,
  M extends AnyModel = AnyModel,
  C extends AnyChrono = AnyChrono,
> = (ctx: {
  readonly config: SchemaInput<Env['config']>
}) => SchedulerCore<
  Prettify<SchedulerCoreEnv<Env>>,
  ReturnType<M['create']>,
  ReturnType<C['create']>
>

/**
 * Scheduler definition that can be extended with middleware before it is
 * materialized with create().
 */
export interface ComposableScheduler<
  Name extends string | symbol = string | symbol,
  Env extends BlankSchedulerEnv = BlankSchedulerEnv,
  M extends AnyModel = AnyModel,
  C extends AnyChrono = AnyChrono,
> {
  readonly name: Name
  readonly modelDef: M
  readonly chronoDef: C
  readonly schema: SchedulerSchema<Env>
  readonly create: SchedulerCreate<Env, M, C>

  /**
   * Adds middleware to this scheduler instance.
   *
   * Must be called before the first create() call. Once create() has been
   * called, the scheduler is locked and use() throws.
   */
  readonly use: SchedulerUseFn<Name, Env, M, C>
}

export type AnyScheduler = ComposableScheduler<any, any, any, any>
