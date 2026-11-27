/** biome-ignore-all lint/suspicious/noExplicitAny: type-level widening for AnyScheduler */

import type { AnyChrono, AnyChronoCore } from '@/chrono/chrono.js'
import type { AnyMiddleware } from '@/middleware/index.js'
import type { AnyModel, AnyModelCore } from '@/model/model.js'
import type { Grade, Rating } from '@/primitives/rating.js'
import type {
  AnyObjectSchema,
  AnySchema,
  Assign,
  EmptyPart,
  FlattenObject,
  IsAny,
  IsSameType,
  Mutable,
  Prettify,
  SchemaInput,
  SchemaOutput,
  SRSSchema,
} from '@/schema/index.js'
import type {
  PreviewResult as DefaultPreviewResult,
  ScheduleResult,
  SchedulerCoreFields,
  SchedulerRevlogCoreFields,
} from './fields.js'
import type { ExtendSchedulerEnv } from './infer.js'
import type { PreviewResult as GradedPreviewResult } from './preview-result.js'
import type { SchedulerRatings } from './ratings.js'

// ==========
// Schedule Result
// ==========

export type PreviewResult<
  Env extends { card: object; revlog: object },
  G extends number = Grade,
> =
  IsSameType<G, Grade> extends true
    ? DefaultPreviewResult<Env>
    : GradedPreviewResult<Env, G>

// ==========
// Rating Scale Env Helpers
// ==========

/** Rating values a scheduler env may carry; omitted for the default scale. */
type SchedulerRatingsEnv = {
  readonly grade?: number
  readonly rating?: number
  readonly preview?: number
}

type SchedulerEnvValue<
  Env extends SchedulerRatingsEnv,
  Key extends keyof SchedulerRatingsEnv,
  Default,
> =
  IsAny<Env> extends true
    ? number
    : [Env] extends [{ readonly [K in Key]: infer Value extends number }]
      ? Value
      : Default

export type SchedulerEnvGrade<Env extends SchedulerRatingsEnv> =
  SchedulerEnvValue<Env, 'grade', Grade>

type SchedulerEnvRating<Env extends SchedulerRatingsEnv> = SchedulerEnvValue<
  Env,
  'rating',
  Rating
>

type SchedulerEnvPreviewGrade<Env extends SchedulerRatingsEnv> =
  SchedulerEnvValue<Env, 'preview', SchedulerEnvGrade<Env>>

export type SchedulerCoreInputGrade<Env extends BlankSchedulerCoreEnv> =
  IsAny<Env> extends true ? any : SchedulerEnvGrade<Env>

type CarryRatingsKey<
  Env extends SchedulerRatingsEnv,
  Key extends keyof SchedulerRatingsEnv,
> = [Env] extends [{ readonly [K in Key]: infer Value extends number }]
  ? { readonly [K in Key]: Value }
  : unknown

/** Keeps the env's rating values when middleware extends it. */
export type CarrySchedulerRatingsEnv<Env extends SchedulerRatingsEnv> =
  Env extends unknown
    ? CarryRatingsKey<Env, 'grade'> &
        CarryRatingsKey<Env, 'rating'> &
        CarryRatingsKey<Env, 'preview'>
    : never

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
  readonly grade?: number
  readonly rating?: number
  readonly preview?: number
}

type SchedulerCoreCardInitInput<Env extends BlankSchedulerCoreEnv> =
  Env extends {
    readonly cardInitInput: infer Input extends object
  }
    ? Input
    : { readonly now?: Env['chrono'] }

export type SchedulerNewCardOptions<Env extends BlankSchedulerCoreEnv> =
  FlattenObject<SchedulerCoreCardInitInput<Env>>

// Keep the mapped option and return types inline so QuickInfo expands them.
export type SchedulerNewCardFn<Env extends BlankSchedulerCoreEnv> =
  SchedulerCoreCardInitInput<Env> extends infer Input
    ? EmptyPart extends SchedulerNewCardOptions<Env>
      ? (
          options?: Input extends unknown
            ? { [Key in keyof Input]: Input[Key] }
            : never
        ) => {
          [Key in keyof Env['card']['output']]: Env['card']['output'][Key]
        }
      : (
          options: Input extends unknown
            ? { [Key in keyof Input]: Input[Key] }
            : never
        ) => {
          [Key in keyof Env['card']['output']]: Env['card']['output'][Key]
        }
    : never

export interface ForwardItem<Time, G extends number = Grade> {
  readonly rating: G
  readonly reviewTime: Time
}

export interface SchedulerForwardInput<Time, Card, G extends number = Grade> {
  /** Keep the array and its entries unchanged until forward() returns, including in model and middleware callbacks. */
  readonly history: readonly ForwardItem<Time, G>[]
  readonly initialCard?: Card
}

export interface SchedulerNextIntervalContext<Card, G extends number = Grade> {
  readonly card: Card
  readonly grade: G
  readonly elapsedDays: number
}

export interface SchedulerDefinition<
  Model extends AnyModel = AnyModel,
  Chrono extends AnyChrono = AnyChrono,
> {
  readonly model: Model
  readonly chrono: Chrono
}

export interface SchedulerCore<
  Env extends BlankSchedulerCoreEnv = BlankSchedulerCoreEnv,
  M extends AnyModelCore = AnyModelCore,
  C extends AnyChronoCore = AnyChronoCore,
> {
  readonly model: M
  readonly chrono: C
  readonly definition: SchedulerDefinition
  readonly ratings: SchedulerRatings<
    SchedulerEnvGrade<Env>,
    SchedulerEnvRating<Env>,
    SchedulerEnvPreviewGrade<Env>
  >
  readonly config: Readonly<Env['config']>
  readonly newCard: SchedulerNewCardFn<Env>
  readonly forward: (
    input: SchedulerForwardInput<
      Env['chrono'],
      Env['card']['input'],
      SchedulerCoreInputGrade<Env>
    >
  ) => ScheduleResult<Env['card']['output'], Env['revlog']['output']>[]
  readonly forget: (input: {
    readonly card: Env['card']['input']
    readonly now?: Env['chrono']
  }) => {
    [Key in keyof Env['card']['output']]: Env['card']['output'][Key]
  }
  /**
   * Resolves the interval policy from an already computed post-rating state.
   * Runs nextInterval handlers only; does not advance the card or chronology.
   */
  readonly nextInterval: (
    memoryState: Parameters<M['nextInterval']>[0],
    desiredRetention: number,
    context: SchedulerNextIntervalContext<
      Env['card']['input'],
      SchedulerCoreInputGrade<Env>
    >
  ) => number
  readonly review: (input: {
    readonly card: Env['card']['input']
    readonly grade: SchedulerCoreInputGrade<Env>
    readonly now?: Env['chrono']
  }) => ScheduleResult<Env['card']['output'], Env['revlog']['output']>
  readonly preview: (input: {
    readonly card: Env['card']['input']
    readonly now?: Env['chrono']
  }) => PreviewResult<
    ScheduleResult<Env['card']['output'], Env['revlog']['output']>,
    SchedulerEnvPreviewGrade<Env>
  >
  readonly rollback: (input: {
    readonly card: Env['card']['output']
    readonly revlog: Env['revlog']['output']
  }) => {
    [Key in keyof Env['card']['output']]: Env['card']['output'][Key]
  }
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
  readonly grade?: number
  readonly rating?: number
  readonly preview?: number
}

type SchedulerCoreFieldSchemaPartFields<
  Env extends BlankSchedulerEnv,
  Key extends 'card' | 'revlog',
  Direction extends 'input' | 'output',
> = FlattenObject<
  Assign<
    Direction extends 'input' ? SchemaInput<Env[Key]> : SchemaOutput<Env[Key]>,
    Key extends 'card'
      ? SchedulerCoreFields<Env['scheduleStatus']>
      : SchedulerRevlogCoreFields<Env['scheduleStatus'], SchedulerEnvGrade<Env>>
  >
>

type SchedulerCoreFieldSchemaPart<
  Env extends BlankSchedulerEnv,
  Key extends 'card' | 'revlog',
  Direction extends 'input' | 'output',
> = FlattenObject<
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
) => CustomScheduler<
  Name,
  FlattenObject<ExtendSchedulerEnv<Env, AddedMWs>>,
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

export type SchedulerDefaultValueContext<Env extends BlankSchedulerEnv> =
  | {
      readonly operation: 'newCard'
      readonly config: Readonly<SchemaOutput<Env['config']>>
      readonly input: Readonly<SchemaOutput<Env['cardInitInput']>['input']>
    }
  | {
      readonly operation: 'forget'
      readonly config: Readonly<SchemaOutput<Env['config']>>
      readonly input: Readonly<SchedulerCoreEnv<Env>['card']['output']>
    }

export interface SchedulerDefaultValue<Env extends BlankSchedulerEnv> {
  readonly newCard: (
    ctx: SchedulerDefaultValueContext<Env>,
    time: Env['chrono']
  ) => {
    [Key in keyof SchedulerCoreEnv<Env>['card']['output']]: SchedulerCoreEnv<Env>['card']['output'][Key]
  }
}

export type SchedulerCreate<
  Env extends BlankSchedulerEnv = BlankSchedulerEnv,
  M extends AnyModel = AnyModel,
  C extends AnyChrono = AnyChrono,
> = (ctx: {
  readonly config: SchemaInput<Env['config']>
}) => Env extends BlankSchedulerEnv
  ? SchedulerCore<
      FlattenObject<SchedulerCoreEnv<Env> & CarrySchedulerRatingsEnv<Env>>,
      ReturnType<M['create']>,
      ReturnType<C['create']>
    >
  : never

/**
 * Scheduler definition that can be extended into independent middleware
 * branches and materialized with create().
 */
export interface CustomScheduler<
  Name extends string | symbol = string | symbol,
  Env extends BlankSchedulerEnv = BlankSchedulerEnv,
  M extends AnyModel = AnyModel,
  C extends AnyChrono = AnyChrono,
> {
  readonly name: Name
  readonly modelDef: M
  readonly chronoDef: C
  readonly defaultValue: SchedulerDefaultValue<Env>
  readonly schema: SchedulerSchema<Env>
  readonly create: SchedulerCreate<Env, M, C>

  /**
   * Returns a new scheduler definition extended with the supplied middleware.
   * The current scheduler and any cores created from it remain unchanged.
   */
  readonly use: SchedulerUseFn<Name, Env, M, C>
}

export type AnyScheduler = CustomScheduler<any, any, any, any>
