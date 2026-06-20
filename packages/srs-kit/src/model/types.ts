import type { Grade } from '../primitives/rating-values.js'
import type {
  AnyObjectSchema,
  AnySchema,
  MaybePromise,
  Prettify,
  SchemaInput,
  SchemaOutput,
} from '../schema/index.js'

export interface ModelSchema<
  ConfigSchema extends AnySchema,
  MemoryStateSchema extends AnyObjectSchema,
> {
  readonly config: ConfigSchema
  readonly memoryState: {
    readonly schema: MemoryStateSchema
    readonly default: (context: {
      readonly config: SchemaOutput<ConfigSchema>
    }) => MaybePromise<SchemaInput<MemoryStateSchema>>
  }
}

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
  readonly [Key in keyof MemoryState as Key extends string
    ? MemoryState[Key] extends number
      ? `${Key}Min` | `${Key}Max`
      : never
    : never]: number
}

export type ModelBounds<MemoryState extends object> = Prettify<
  ModelBoundsShape<MemoryState>
>

export interface IModel<MemoryState extends object> {
  readonly bounds: ModelBounds<MemoryState>
  readonly step: (input: ModelStepInput<MemoryState>) => MemoryState
  readonly nextInterval: (
    memoryState: Readonly<MemoryState>,
    desiredRetention: number
  ) => number
  readonly forgettingCurve: (
    memoryState: Readonly<MemoryState>,
    elapsedDays: number
  ) => number
  readonly forward: (
    input: ModelForwardInput<MemoryState>
  ) => readonly MemoryState[]
}

export type ModelName = string | symbol

export type ModelCreate<
  ConfigSchema extends AnySchema,
  MemoryStateSchema extends AnyObjectSchema,
  Runtime extends IModel<SchemaOutput<MemoryStateSchema>> = IModel<
    SchemaOutput<MemoryStateSchema>
  >,
> = (context: {
  readonly config: SchemaOutput<ConfigSchema>
}) => MaybePromise<Runtime>

export interface ModelDefinition<
  ConfigSchema extends AnySchema = AnySchema,
  MemoryStateSchema extends AnyObjectSchema = AnyObjectSchema,
  Create extends ModelCreate<ConfigSchema, MemoryStateSchema> = ModelCreate<
    ConfigSchema,
    MemoryStateSchema
  >,
> {
  readonly name: ModelName
  readonly schema: ModelSchema<ConfigSchema, MemoryStateSchema>
  readonly create: Create
}
