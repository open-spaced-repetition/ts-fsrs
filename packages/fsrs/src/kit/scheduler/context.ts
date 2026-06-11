import { z } from 'zod/mini'
import type { Grade } from '../../models.js'
import type {
  EmptyObject,
  Prettify,
  SchemaInput,
  SchemaInputOrEmpty,
  SchemaOutput,
  SchemaOutputOrEmpty,
  StandardSchemaV1Contract,
} from '../standard-schema.js'
import type { IFSRSModelOperations } from '../types.js'
import type { SchedulerMiddleware } from './middleware.js'
import type { SchedulerModelDefinition } from './model.js'

export const schedulerCoreFieldSchema = z.object({
  interval: z._default(z.number(), 0),
})

// Reset values for the scheduler core fields, declared explicitly rather than
// recovered from the schema defaults above.
export const schedulerCoreFieldDefaults = {
  interval: 0,
} satisfies SchedulerCoreFieldOutput

type SchedulerCoreFieldInput = SchemaInput<typeof schedulerCoreFieldSchema>

type SchedulerCoreFieldOutput = SchemaOutput<typeof schedulerCoreFieldSchema>

type MiddlewareSchemaPart = 'config' | 'card' | 'revlog' | 'store'

type MiddlewareSchemas<Middleware> =
  Middleware extends SchedulerMiddleware<
    infer ConfigSchema,
    infer CardFieldSchema,
    infer RevlogFieldSchema,
    infer StoreSchema
  >
    ? {
        config: ConfigSchema
        card: CardFieldSchema
        revlog: RevlogFieldSchema
        store: StoreSchema
      }
    : {
        config: undefined
        card: undefined
        revlog: undefined
        store: undefined
      }

type MergeMiddlewareSchemas<
  Middlewares extends readonly SchedulerMiddleware[],
  Part extends MiddlewareSchemaPart,
  Kind extends 'input' | 'output',
> = Middlewares extends readonly [
  infer Head extends SchedulerMiddleware,
  ...infer Tail extends readonly SchedulerMiddleware[],
]
  ? Prettify<
      (Kind extends 'input'
        ? SchemaInputOrEmpty<MiddlewareSchemas<Head>[Part]>
        : SchemaOutputOrEmpty<MiddlewareSchemas<Head>[Part]>) &
        MergeMiddlewareSchemas<Tail, Part, Kind>
    >
  : EmptyObject

type MergeMiddlewareInputs<
  Middlewares extends readonly SchedulerMiddleware[],
  Part extends Extract<MiddlewareSchemaPart, 'config' | 'card'>,
> = MergeMiddlewareSchemas<Middlewares, Part, 'input'>

type MergeMiddlewareOutputs<
  Middlewares extends readonly SchedulerMiddleware[],
  Part extends MiddlewareSchemaPart,
> = MergeMiddlewareSchemas<Middlewares, Part, 'output'>

type SchedulerModelMemoryState<Model extends SchedulerModelDefinition> =
  Model extends SchedulerModelDefinition<
    infer _ConfigSchema,
    infer MemoryStateSchema
  >
    ? SchemaOutput<MemoryStateSchema>
    : never

type SchedulerSnapshot<
  MemoryState extends object,
  CoreFields extends object,
  Fields extends object,
> = Prettify<
  {
    [Key in keyof Fields]: Fields[Key]
  } & {
    [Key in keyof CoreFields as Key extends keyof Fields
      ? never
      : Key]: CoreFields[Key]
  } & {
    [Key in keyof MemoryState as Key extends keyof Fields | keyof CoreFields
      ? never
      : Key]: MemoryState[Key]
  }
>

type SchedulerRatedSnapshot<
  MemoryState extends object,
  CoreFields extends object,
  Fields extends object,
> = Prettify<{
  [Key in
    | 'rating'
    | keyof SchedulerSnapshot<
        MemoryState,
        CoreFields,
        Fields
      >]: Key extends 'rating'
    ? Grade
    : Key extends keyof SchedulerSnapshot<MemoryState, CoreFields, Fields>
      ? SchedulerSnapshot<MemoryState, CoreFields, Fields>[Key]
      : never
}>

export type SchedulerConfigInput<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
> = Prettify<
  SchemaInput<Model['configSchema']> &
    MergeMiddlewareInputs<Middlewares, 'config'>
>

export type SchedulerConfig<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
> = Prettify<
  SchemaOutput<Model['configSchema']> &
    MergeMiddlewareOutputs<Middlewares, 'config'>
>

export type SchedulerMiddlewareConfig<
  Middlewares extends readonly SchedulerMiddleware[],
> = Prettify<MergeMiddlewareOutputs<Middlewares, 'config'>>

export type SchedulerStore<Middlewares extends readonly SchedulerMiddleware[]> =
  Prettify<MergeMiddlewareOutputs<Middlewares, 'store'>>

export interface SchedulerStoreAccessor<Store> {
  get<Refinement = Store, Key extends keyof Refinement = keyof Refinement>(
    key: Key
  ): Refinement[Key]
  set<Refinement = Store, Key extends keyof Refinement = keyof Refinement>(
    key: Key,
    value: Refinement[Key]
  ): void
}

export type SchedulerStoreData<
  Middlewares extends readonly SchedulerMiddleware[],
> = SchedulerStore<Middlewares>

export type ReviewCardInput<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
> = SchedulerSnapshot<
  SchemaInput<Model['memoryStateSchema']>,
  SchedulerCoreFieldInput,
  MergeMiddlewareInputs<Middlewares, 'card'>
>

export type ReviewCard<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
> = SchedulerSnapshot<
  SchedulerModelMemoryState<Model>,
  SchedulerCoreFieldOutput,
  MergeMiddlewareOutputs<Middlewares, 'card'>
>

export type SchedulerRevlog<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
> = SchedulerRatedSnapshot<
  SchedulerModelMemoryState<Model>,
  SchedulerCoreFieldOutput,
  MergeMiddlewareOutputs<Middlewares, 'revlog'>
>

export interface SchedulerReviewInput<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
> {
  readonly card: ReviewCardInput<Model, Middlewares>
  readonly rating: Grade
  readonly elapsedDays: number
}

export interface NormalizedSchedulerReviewInput<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
> {
  readonly card: ReviewCard<Model, Middlewares>
  readonly rating: Grade
  readonly elapsedDays: number
}

export interface SchedulerPreviewInput<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
> {
  readonly card: ReviewCardInput<Model, Middlewares>
  readonly elapsedDays: number
}

export interface SchedulerResetInput<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
> {
  readonly card: ReviewCardInput<Model, Middlewares>
}

export type SchedulerResetResult<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
> = ReviewCard<Model, Middlewares>

export interface ReviewContext<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
> {
  readonly input: NormalizedSchedulerReviewInput<Model, Middlewares>
  readonly config: SchedulerConfig<Model, Middlewares>
  readonly model: ReturnType<Model['create']>
  readonly store: SchedulerStoreAccessor<SchedulerStoreData<Middlewares>>
  readonly result: ReviewResult<Model, Middlewares>
}

export interface ReviewResult<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
> {
  readonly memoryState: SchedulerModelMemoryState<Model>
  card: ReviewCard<Model, Middlewares>
  log: SchedulerRevlog<Model, Middlewares>
}

export type PreviewResult<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
> = {
  readonly [Rating in Grade]: ReviewResult<Model, Middlewares>
} & {
  [Symbol.iterator](): IterableIterator<ReviewResult<Model, Middlewares>>
}

export interface SchedulerRollbackInput<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
> {
  readonly card: ReviewCard<Model, Middlewares>
  readonly revlog: SchedulerRevlog<Model, Middlewares>
}

export interface RollbackContext<
  Model extends SchedulerModelDefinition,
  Middlewares extends readonly SchedulerMiddleware[],
> {
  readonly input: SchedulerRollbackInput<Model, Middlewares>
  readonly config: SchedulerConfig<Model, Middlewares>
  readonly model: ReturnType<Model['create']>
  readonly store: SchedulerStoreAccessor<SchedulerStoreData<Middlewares>>
  readonly result: ReviewCard<Model, Middlewares>
}

export type MiddlewareSchedulerModel<
  Model extends SchedulerModelDefinition = SchedulerModelDefinition,
> = IFSRSModelOperations<SchedulerModelMemoryState<Model>>

type MiddlewareStore<StoreSchema> = SchedulerStoreAccessor<
  SchemaOutputOrEmpty<StoreSchema>
>

export type MiddlewareReviewContext<
  Model extends SchedulerModelDefinition,
  ConfigSchema extends StandardSchemaV1Contract,
  CardFieldSchema extends StandardSchemaV1Contract,
  RevlogFieldSchema extends StandardSchemaV1Contract,
  StoreSchema extends StandardSchemaV1Contract,
> = {
  readonly input: {
    readonly card: SchedulerSnapshot<
      SchedulerModelMemoryState<Model>,
      SchedulerCoreFieldOutput,
      SchemaOutputOrEmpty<CardFieldSchema>
    >
    readonly rating: Grade
    readonly elapsedDays: number
  }
  readonly config: SchemaOutputOrEmpty<ConfigSchema>
  readonly model: MiddlewareSchedulerModel<Model>
  readonly store: MiddlewareStore<StoreSchema>
  readonly result: MiddlewareReviewResult<
    Model,
    ConfigSchema,
    CardFieldSchema,
    RevlogFieldSchema,
    StoreSchema
  >
}

export type MiddlewareReviewResult<
  Model extends SchedulerModelDefinition,
  _ConfigSchema extends StandardSchemaV1Contract,
  CardFieldSchema extends StandardSchemaV1Contract,
  RevlogFieldSchema extends StandardSchemaV1Contract,
  _StoreSchema extends StandardSchemaV1Contract,
> = {
  readonly memoryState: SchedulerModelMemoryState<Model>
  card: SchedulerSnapshot<
    SchedulerModelMemoryState<Model>,
    SchedulerCoreFieldOutput,
    SchemaOutputOrEmpty<CardFieldSchema>
  >
  log: SchedulerRatedSnapshot<
    SchedulerModelMemoryState<Model>,
    SchedulerCoreFieldOutput,
    SchemaOutputOrEmpty<RevlogFieldSchema>
  >
}

export type MiddlewareRollbackContext<
  Model extends SchedulerModelDefinition,
  ConfigSchema extends StandardSchemaV1Contract,
  CardFieldSchema extends StandardSchemaV1Contract,
  RevlogFieldSchema extends StandardSchemaV1Contract,
  StoreSchema extends StandardSchemaV1Contract,
> = {
  readonly input: {
    readonly card: SchedulerSnapshot<
      SchedulerModelMemoryState<Model>,
      SchedulerCoreFieldOutput,
      SchemaOutputOrEmpty<CardFieldSchema>
    >
    readonly revlog: SchedulerRatedSnapshot<
      SchedulerModelMemoryState<Model>,
      SchedulerCoreFieldOutput,
      SchemaOutputOrEmpty<RevlogFieldSchema>
    >
  }
  readonly config: SchemaOutputOrEmpty<ConfigSchema>
  readonly model: MiddlewareSchedulerModel<Model>
  readonly store: MiddlewareStore<StoreSchema>
  readonly result: SchedulerSnapshot<
    SchedulerModelMemoryState<Model>,
    SchedulerCoreFieldOutput,
    SchemaOutputOrEmpty<CardFieldSchema>
  >
}
