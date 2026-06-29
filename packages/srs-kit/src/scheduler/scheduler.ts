/** biome-ignore-all lint/suspicious/noExplicitAny: type-level widening for AnyScheduler */
import type { Grade } from '@/primitives/rating.js'
import type {
  AnyObjectSchema,
  AnySchema,
  SchemaInput,
  SchemaOutput,
} from '@/schema/index.js'
import type { ExtendSchedulerEnv } from './infer.js'
import type { AnyMiddleware } from './middleware.js'

// ==========
// Schedule Result
// ==========

export interface ScheduleResult<Card, Revlog> {
  readonly card: Readonly<Card>
  readonly revlog: Readonly<Revlog>
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

export interface SchedulerCore<
  Env extends BlankSchedulerCoreEnv = BlankSchedulerCoreEnv,
> {
  readonly config: Readonly<Env['config']>
  readonly newCard: (options?: {
    readonly now?: Env['chrono']
  }) => Readonly<Env['card']['output']>
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
  }) => Readonly<Env['card']['output']>
}

export type AnySchedulerCore = SchedulerCore<any>

// ==========
// Scheduler
// ==========

export type BlankSchedulerEnv = {
  readonly chrono: unknown
  readonly config: AnySchema
  readonly card: AnyObjectSchema
  readonly revlog: AnyObjectSchema
  readonly scheduleStatus: string
}

export interface SchedulerSchema<
  Env extends BlankSchedulerEnv = BlankSchedulerEnv,
> {
  readonly config: Env['config']
  readonly card: Env['card']
  readonly revlog: Env['revlog']
}

export type SchedulerUseFn<
  Name extends string | symbol,
  Env extends BlankSchedulerEnv,
> = <const AddedMWs extends readonly AnyMiddleware[]>(
  ...middlewares: AddedMWs
) => ComposableScheduler<
  Name,
  {
    readonly [K in keyof ExtendSchedulerEnv<Env, AddedMWs>]: ExtendSchedulerEnv<
      Env,
      AddedMWs
    >[K]
  }
>

export type SchedulerCoreEnv<Env extends BlankSchedulerEnv> = {
  readonly config: SchemaOutput<Env['config']>
  readonly card: {
    readonly input: SchemaInput<Env['card']>
    readonly output: SchemaOutput<Env['card']>
  }
  readonly revlog: {
    readonly input: SchemaInput<Env['revlog']>
    readonly output: SchemaOutput<Env['revlog']>
  }
  readonly chrono: Env['chrono']
  readonly scheduleStatus: Env['scheduleStatus']
}

export type SchedulerCreate<Env extends BlankSchedulerEnv = BlankSchedulerEnv> =
  (ctx: { readonly config: SchemaInput<Env['config']> }) => SchedulerCore<{
    readonly config: SchemaOutput<Env['config']>
    readonly card: {
      readonly input: SchemaInput<Env['card']>
      readonly output: SchemaOutput<Env['card']>
    }
    readonly revlog: {
      readonly input: SchemaInput<Env['revlog']>
      readonly output: SchemaOutput<Env['revlog']>
    }
    readonly chrono: Env['chrono']
    readonly scheduleStatus: Env['scheduleStatus']
  }>

/**
 * Scheduler definition that can be extended with middleware before it is
 * materialized with create().
 */
export interface ComposableScheduler<
  Name extends string | symbol = string | symbol,
  Env extends BlankSchedulerEnv = BlankSchedulerEnv,
> {
  readonly name: Name
  readonly schema: SchedulerSchema<Env>
  readonly create: SchedulerCreate<Env>

  /**
   * Adds middleware to this scheduler instance.
   *
   * Must be called before the first create() call. Once create() has been
   * called, the scheduler is locked and use() throws SRSSchedulerError.
   */
  readonly use: SchedulerUseFn<Name, Env>
}

export type AnyScheduler = ComposableScheduler<any, any>
