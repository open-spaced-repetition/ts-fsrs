/** biome-ignore-all lint/suspicious/noExplicitAny: type-level widening for AnyModel / AnyModelCore */
import type { Grade } from '@/primitives/rating.js'
import type {
  RatingScale,
  RatingScaleCertainGradeOf,
  RatingScaleGradeOf,
  RatingScaleRatingOf,
} from '@/primitives/rating-scale.js'
import type {
  AnyObjectSchema,
  AnySchema,
  BoundsPrefix,
  FlattenObject,
  IsAny,
  Prettify,
  SchemaInput,
  SchemaOutput,
} from '@/schema/index.js'

// ==========
// Model Core
// ==========
export interface ModelStepInput<
  MemoryState extends object,
  G extends number = Grade,
> {
  readonly memoryState: Readonly<MemoryState> | null
  readonly rating: G
  readonly elapsedDays: number
  readonly retrievability?: number
}

export interface ModelReview<G extends number = Grade> {
  readonly rating: G
  readonly deltaT: number
}

export interface ModelForwardInput<
  MemoryState extends object,
  G extends number = Grade,
> {
  readonly history: readonly ModelReview<G>[]
  readonly initialState?: Readonly<MemoryState> | null
}

type ModelBoundsShape<MemoryState extends object> = {
  readonly [Key in string & keyof MemoryState as MemoryState[Key] extends number
    ?
        | `${BoundsPrefix<Key, MemoryState>}Min`
        | `${BoundsPrefix<Key, MemoryState>}Max`
    : never]: number
}

export type ModelBounds<MemoryState extends object> = Prettify<
  ModelBoundsShape<MemoryState>
>

export type BlankModelCoreEnv = {
  readonly config?: unknown
  readonly memoryState: object
  readonly algorithm: unknown
  /**
   * Overrides the `forward` result type. A non-array result must be a packed
   * typed array with one fixed-width row per review, in history order.
   */
  readonly forwardResult?: unknown
  /** Grades accepted by `step` and `forward`; omitted for the default `Grade`. */
  readonly grade?: number
}

type ModelCoreConfig<Env extends BlankModelCoreEnv> = Env extends {
  readonly config: infer Config
}
  ? Config
  : unknown

/** Defaults to one memory state per review unless the env sets `forwardResult`. */
type ModelForwardResult<Env extends BlankModelCoreEnv> =
  IsAny<Env> extends true
    ? readonly Env['memoryState'][]
    : Env extends { readonly forwardResult: infer Result }
      ? Result
      : readonly Env['memoryState'][]

type ModelCoreGrade<Env extends BlankModelCoreEnv> =
  IsAny<Env> extends true
    ? any
    : Env extends { readonly grade: infer G extends number }
      ? G
      : Grade

export interface ModelCore<Env extends BlankModelCoreEnv = BlankModelCoreEnv> {
  readonly config: ModelCoreConfig<Env>
  readonly bounds: ModelBounds<Env['memoryState']>
  readonly algorithm: Env['algorithm']
  readonly step: (
    input: ModelStepInput<Env['memoryState'], ModelCoreGrade<Env>>
  ) => Env['memoryState']
  readonly nextInterval: (
    memoryState: Readonly<Env['memoryState']>,
    desiredRetention: number
  ) => number
  readonly forgettingCurve: (
    memoryState: Readonly<Env['memoryState']>,
    elapsedDays: number
  ) => number
  readonly forward: (
    input: ModelForwardInput<Env['memoryState'], ModelCoreGrade<Env>>
  ) => ModelForwardResult<Env>
}

export type AnyModelCore = ModelCore<any>

// ==========
// Model
// ==========

export type BlankModelSchema = {
  readonly config: AnySchema
  readonly memoryState: AnyObjectSchema
}

export interface ModelSchema<
  Schema extends BlankModelSchema = BlankModelSchema,
> {
  readonly config: Schema['config']
  readonly memoryState: Schema['memoryState']
}

export type ModelCreate<
  Schema extends BlankModelSchema,
  Algorithm = unknown,
> = (ctx: {
  readonly config:
    | SchemaInput<Schema['config']>
    | SchemaOutput<Schema['config']>
  readonly migrate?: boolean
  readonly clip?: boolean
  readonly check?: boolean
  /**
   * The config has already been parsed by the scheduler schema.
   * Model implementations should use it directly and skip create-time
   * validation, migration, clipping, range checks, and freezing.
   */
  readonly bypass?: boolean
}) => Schema extends unknown
  ? ModelCore<
      {
        readonly config: SchemaOutput<Schema['config']>
        readonly memoryState: SchemaOutput<Schema['memoryState']>
        readonly algorithm: Algorithm
      } & ModelCreateEnvExtras<Schema>
    >
  : never

// `Model` passes its env as `Schema`, so a declared `forwardResult` or
// `grade` carries over. Omitted keys add nothing, keeping hovers unchanged.
type ModelCreateEnvExtras<Schema> =
  IsAny<Schema> extends true
    ? { readonly grade: any }
    : (Schema extends { readonly forwardResult: infer Result }
        ? { readonly forwardResult: Result }
        : unknown) &
        (Schema extends { readonly grade: infer G extends number }
          ? { readonly grade: G }
          : unknown)

export type BlankModelEnv = {
  readonly name: string | symbol
  readonly config: AnySchema
  readonly memoryState: AnyObjectSchema
  readonly algorithm: unknown
  readonly forwardResult?: unknown
  /** Non-manual rating values; omitted for the default `Grade`. */
  readonly grade?: number
  /** Every rating value, manual ones included; set together with `grade`. */
  readonly rating?: number
}

type ModelRatings<Env extends BlankModelEnv> =
  IsAny<Env> extends true
    ? RatingScale | undefined
    : Env extends { readonly grade: number }
      ? RatingScale
      : undefined

export interface Model<Env extends BlankModelEnv = BlankModelEnv> {
  readonly name: Env['name']
  readonly ratings?: ModelRatings<Env>
  readonly schema: ModelSchema<Env>
  readonly defaultValue: {
    readonly memoryState: (ctx: {
      readonly config: SchemaOutput<Env['config']>
    }) => SchemaInput<Env['memoryState']>
  }
  readonly create: ModelCreate<Env, Env['algorithm']>
}

export type AnyModel = Model<any>

type DefineModelGrade<Ratings extends RatingScale | undefined> = [
  undefined,
] extends [Ratings]
  ? Grade
  : RatingScaleGradeOf<Exclude<Ratings, undefined>>

type RequiredRatingsOfDefinition<Definition> = [Definition] extends [
  { readonly ratings: infer Scale extends RatingScale },
]
  ? Scale
  : undefined

type DefineModelKeys<Name, Ratings> =
  | { readonly name: Name; readonly ratings: NonNullable<Ratings> }
  | ([Ratings] extends [undefined]
      ? { readonly name: Name; readonly ratings?: undefined }
      : never)

type DefinedModelRatingsEnv<Scale extends RatingScale> =
  | {
      readonly grade: RatingScaleGradeOf<Scale>
      readonly rating: RatingScaleRatingOf<Scale>
    }
  | (number extends RatingScaleGradeOf<Scale>
      ? never
      : Exclude<
            RatingScaleGradeOf<Scale>,
            RatingScaleCertainGradeOf<Scale>
          > extends never
        ? never
        : {
            readonly grade: RatingScaleCertainGradeOf<Scale>
            readonly rating: RatingScaleRatingOf<Scale>
          })

/**
 * The env of a `defineModel` result. A custom scale contributes its grade and
 * rating values; default `forwardResult` and ratings are omitted so hovers and
 * declarations stay unchanged.
 */
type DefinedModelEnv<
  Name extends string | symbol,
  ConfigSchema extends AnySchema,
  MemoryStateSchema extends AnyObjectSchema,
  Algorithm,
  ForwardResult,
  Scale extends RatingScale | undefined,
> = FlattenObject<
  {
    readonly name: Name
    readonly config: ConfigSchema
    readonly memoryState: MemoryStateSchema
    readonly algorithm: Algorithm
  } & ([ForwardResult] extends [readonly SchemaOutput<MemoryStateSchema>[]]
    ? unknown
    : { readonly forwardResult: ForwardResult }) &
    (Scale extends RatingScale ? DefinedModelRatingsEnv<Scale> : unknown)
>

// `step` and `forward` are replaced so `defineModel` can infer `ForwardResult`
// and work with generic `Ratings` parameters without deferred env conditionals.
type DefineModelCreate<
  Schema extends BlankModelSchema,
  Algorithm,
  ForwardResult,
  Ratings extends RatingScale | undefined,
> = (...args: Parameters<ModelCreate<Schema, Algorithm>>) => Omit<
  ModelCore<{
    readonly config: SchemaOutput<Schema['config']>
    readonly memoryState: SchemaOutput<Schema['memoryState']>
    readonly algorithm: Algorithm
  }>,
  'step' | 'forward'
> & {
  readonly step: (
    input: ModelStepInput<
      SchemaOutput<Schema['memoryState']>,
      DefineModelGrade<Ratings>
    >
  ) => SchemaOutput<Schema['memoryState']>
  readonly forward: (
    input: ModelForwardInput<
      SchemaOutput<Schema['memoryState']>,
      DefineModelGrade<Ratings>
    >
  ) => ForwardResult
}

export function defineModel<
  const Name extends string | symbol,
  const ConfigSchema extends AnySchema,
  const MemoryStateSchema extends AnyObjectSchema,
  const Algorithm,
  ForwardResult = readonly SchemaOutput<MemoryStateSchema>[],
  const Ratings extends RatingScale | undefined = undefined,
  const Definition extends DefineModelKeys<Name, Ratings> = DefineModelKeys<
    Name,
    Ratings
  >,
>(
  definition: Definition & {
    readonly name: Name
    readonly ratings?: Ratings
    readonly schema: ModelSchema<{
      readonly config: ConfigSchema
      readonly memoryState: MemoryStateSchema
    }>
    readonly defaultValue: {
      readonly memoryState: (ctx: {
        readonly config: SchemaOutput<ConfigSchema>
      }) => SchemaInput<MemoryStateSchema>
    }
    readonly create: DefineModelCreate<
      {
        readonly config: ConfigSchema
        readonly memoryState: MemoryStateSchema
      },
      Algorithm,
      ForwardResult,
      Ratings
    >
  }
) {
  return definition as unknown as Model<
    DefinedModelEnv<
      Name,
      ConfigSchema,
      MemoryStateSchema,
      Algorithm,
      ForwardResult,
      RequiredRatingsOfDefinition<Definition>
    >
  >
}
