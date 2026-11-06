/** biome-ignore-all lint/suspicious/noExplicitAny: type-level widening for AnyModel / AnyModelCore */
import type { Grade } from '@/primitives/rating.js'
import type {
  AnyObjectSchema,
  AnySchema,
  BoundsPrefix,
  Prettify,
  SchemaInput,
  SchemaOutput,
} from '@/schema/index.js'

// ==========
// Model Core
// ==========
export interface ModelStepInput<MemoryState extends object> {
  readonly memoryState: Readonly<MemoryState> | null
  readonly rating: Grade
  readonly elapsedDays: number
  readonly retrievability?: number
}

export interface ModelReview {
  readonly rating: Grade
  readonly deltaT: number
}

export interface ModelForwardInput<MemoryState extends object> {
  readonly history: readonly ModelReview[]
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
  readonly forwardResult?: Float64Array
}

type ModelCoreConfig<Env extends BlankModelCoreEnv> = Env extends {
  readonly config: infer Config
}
  ? Config
  : unknown

export interface ModelCore<Env extends BlankModelCoreEnv = BlankModelCoreEnv> {
  readonly config: ModelCoreConfig<Env>
  readonly bounds: ModelBounds<Env['memoryState']>
  readonly algorithm: Env['algorithm']
  readonly step: (
    input: ModelStepInput<Env['memoryState']>
  ) => Env['memoryState']
  readonly nextInterval: (
    memoryState: Readonly<Env['memoryState']>,
    desiredRetention: number
  ) => number
  readonly forgettingCurve: (
    memoryState: Readonly<Env['memoryState']>,
    elapsedDays: number
  ) => number
  /** Packed results contain one fixed-width row per review, in history order. */
  readonly forward: (
    input: ModelForwardInput<Env['memoryState']>
  ) => Env extends { readonly forwardResult: Float64Array }
    ? Float64Array
    : readonly Env['memoryState'][]
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
}) => ModelCore<
  {
    readonly config: SchemaOutput<Schema['config']>
    readonly memoryState: SchemaOutput<Schema['memoryState']>
    readonly algorithm: Algorithm
  } & (Schema extends { readonly forwardResult: Float64Array }
    ? { readonly forwardResult: Float64Array }
    : unknown)
>

export type BlankModelEnv = {
  readonly name: string | symbol
  readonly config: AnySchema
  readonly memoryState: AnyObjectSchema
  readonly algorithm: unknown
  readonly forwardResult?: Float64Array
}

export interface Model<Env extends BlankModelEnv = BlankModelEnv> {
  readonly name: Env['name']
  readonly schema: ModelSchema<Env>
  readonly defaultValue: {
    readonly memoryState: (ctx: {
      readonly config: SchemaOutput<Env['config']>
    }) => SchemaInput<Env['memoryState']>
  }
  readonly create: ModelCreate<Env, Env['algorithm']>
}

export type AnyModel = Model<any>

type InferModelCreate<
  Schema extends BlankModelSchema,
  Algorithm,
  ForwardResult,
> = (...args: Parameters<ModelCreate<Schema, Algorithm>>) => Omit<
  ReturnType<ModelCreate<Schema, Algorithm>>,
  'forward'
> & {
  readonly forward: (
    input: ModelForwardInput<SchemaOutput<Schema['memoryState']>>
  ) => ForwardResult
}

export function defineModel<
  const Name extends string | symbol,
  const ConfigSchema extends AnySchema,
  const MemoryStateSchema extends AnyObjectSchema,
  const Algorithm,
  const ForwardResult extends
    | readonly SchemaOutput<MemoryStateSchema>[]
    | Float64Array = readonly SchemaOutput<MemoryStateSchema>[],
>(definition: {
  readonly name: Name
  readonly schema: ModelSchema<{
    readonly config: ConfigSchema
    readonly memoryState: MemoryStateSchema
  }>
  readonly defaultValue: {
    readonly memoryState: (ctx: {
      readonly config: SchemaOutput<ConfigSchema>
    }) => SchemaInput<MemoryStateSchema>
  }
  readonly create: InferModelCreate<
    { readonly config: ConfigSchema; readonly memoryState: MemoryStateSchema },
    Algorithm,
    ForwardResult
  >
}) {
  type Env = {
    readonly name: Name
    readonly config: ConfigSchema
    readonly memoryState: MemoryStateSchema
    readonly algorithm: Algorithm
  }
  return definition as unknown as ForwardResult extends Float64Array
    ? Model<Env & { readonly forwardResult: Float64Array }>
    : Model<Env>
}
