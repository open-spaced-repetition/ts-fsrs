/** biome-ignore-all lint/suspicious/noExplicitAny: type-level widening for AnyModel / AnyModelCore */
import type { Grade } from '@/primitives/rating.js'
import type {
  AnyObjectSchema,
  AnySchema,
  BoundsPrefix,
  IsAny,
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
  /**
   * Overrides the `forward` result type. A non-array result must be a packed
   * typed array with one fixed-width row per review, in history order.
   */
  readonly forwardResult?: unknown
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
  readonly forward: (
    input: ModelForwardInput<Env['memoryState']>
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
}) => ModelCore<
  {
    readonly config: SchemaOutput<Schema['config']>
    readonly memoryState: SchemaOutput<Schema['memoryState']>
    readonly algorithm: Algorithm
  } & (Schema extends { readonly forwardResult: infer Result }
    ? // `Model` passes its env as `Schema`, so a declared `forwardResult` carries over.
      { readonly forwardResult: Result }
    : // Omitted: ModelForwardResult falls back to memory states, keeping hovers unchanged.
      unknown)
>

export type BlankModelEnv = {
  readonly name: string | symbol
  readonly config: AnySchema
  readonly memoryState: AnyObjectSchema
  readonly algorithm: unknown
  readonly forwardResult?: unknown
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

// `forward` is replaced so `defineModel` can infer `ForwardResult` from `create`.
type DefineModelCreate<
  Schema extends BlankModelSchema,
  Algorithm,
  ForwardResult,
> = (...args: Parameters<ModelCreate<Schema, Algorithm>>) => Omit<
  ModelCore<{
    readonly config: SchemaOutput<Schema['config']>
    readonly memoryState: SchemaOutput<Schema['memoryState']>
    readonly algorithm: Algorithm
  }>,
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
  ForwardResult = readonly SchemaOutput<MemoryStateSchema>[],
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
  readonly create: DefineModelCreate<
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
  // Omit the default forward result to keep hovers and declarations unchanged.
  return definition as unknown as [ForwardResult] extends [
    readonly SchemaOutput<MemoryStateSchema>[],
  ]
    ? Model<Env>
    : Model<Env & { readonly forwardResult: ForwardResult }>
}
