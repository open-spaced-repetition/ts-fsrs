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
}

type ModelCoreConfig<Env extends BlankModelCoreEnv> = Env extends {
  readonly config: infer Config
}
  ? Config
  : unknown

export interface ModelCore<Env extends BlankModelCoreEnv = BlankModelCoreEnv> {
  readonly config: ModelCoreConfig<Env>
  readonly bounds: ModelBounds<Env['memoryState']>
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
  ) => readonly Env['memoryState'][]
}

export type AnyModelCore = ModelCore<{
  readonly config: any
  readonly memoryState: any
}>

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
  ConfigSchema extends AnySchema,
  MemoryStateSchema extends AnyObjectSchema,
> = (ctx: { readonly config: SchemaInput<ConfigSchema> }) => ModelCore<{
  readonly config: SchemaOutput<ConfigSchema>
  readonly memoryState: SchemaOutput<MemoryStateSchema>
}>

export type BlankModelEnv = {
  readonly name: string | symbol
  readonly config: AnySchema
  readonly memoryState: AnyObjectSchema
}

export interface Model<Env extends BlankModelEnv = BlankModelEnv> {
  readonly name: Env['name']
  readonly schema: ModelSchema<Env>
  readonly defaultValue: {
    readonly memoryState: (ctx: {
      readonly config: SchemaOutput<Env['config']>
    }) => SchemaInput<Env['memoryState']>
  }
  readonly create: ModelCreate<Env['config'], Env['memoryState']>
}

export type AnyModel = Model<{
  readonly name: any
  readonly config: any
  readonly memoryState: any
}>

export function defineModel<
  const Name extends string | symbol,
  const ConfigSchema extends AnySchema,
  const MemoryStateSchema extends AnyObjectSchema,
>(
  definition: Model<{
    readonly name: Name
    readonly config: ConfigSchema
    readonly memoryState: MemoryStateSchema
  }>
): Model<{
  readonly name: Name
  readonly config: ConfigSchema
  readonly memoryState: MemoryStateSchema
}> {
  return definition
}
