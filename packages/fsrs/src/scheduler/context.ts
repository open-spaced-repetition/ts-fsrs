import { z } from 'zod/mini'
import type { IFSRSModel } from '../kit/types.js'
import type { Grade } from '../models.js'
import type { SchedulerMiddleware } from './middleware.js'
import type { FSRSMemoryState, SchedulerModelFactory } from './model.js'
import type {
  EmptyObject,
  Prettify,
  SchemaFragmentValue,
  SchemaInput,
  SchemaInputOrEmpty,
  SchemaOutput,
  SchemaOutputOrEmpty,
} from './standard-schema.js'

export const schedulerCoreFieldSchema = z.object({
  interval: z._default(z.number(), 0),
})

type SchedulerCoreFieldInput = SchemaInput<typeof schedulerCoreFieldSchema>

type SchedulerCoreFieldOutput = SchemaOutput<typeof schedulerCoreFieldSchema>

type MiddlewareSchemaPart = 'config' | 'field' | 'store'

type MiddlewareSchemas<Middleware> =
  Middleware extends SchedulerMiddleware<
    infer ConfigSchema,
    infer FieldSchema,
    infer StoreSchema
  >
    ? {
        config: ConfigSchema
        field: FieldSchema
        store: StoreSchema
      }
    : {
        config: undefined
        field: undefined
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
  Part extends Extract<MiddlewareSchemaPart, 'config' | 'field'>,
> = MergeMiddlewareSchemas<Middlewares, Part, 'input'>

type MergeMiddlewareOutputs<
  Middlewares extends readonly SchedulerMiddleware[],
  Part extends MiddlewareSchemaPart,
> = MergeMiddlewareSchemas<Middlewares, Part, 'output'>

export type SchedulerConfigInput<
  Model extends SchedulerModelFactory,
  Middlewares extends readonly SchedulerMiddleware[],
> = Prettify<
  SchemaInput<Model['configSchema']> &
    MergeMiddlewareInputs<Middlewares, 'config'>
>

export type SchedulerConfig<
  Model extends SchedulerModelFactory,
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

export type SchedulerStoreValue = SchemaFragmentValue<
  Map<Grade, number> | ReadonlyMap<Grade, number>
>

export type SchedulerRuntimeStore = {
  readonly [key: symbol]: SchedulerStoreValue
}

export interface SchedulerStoreAccessor<Store extends object> {
  get<
    Refinement extends object = Store,
    Key extends keyof Refinement = keyof Refinement,
  >(key: Key): Refinement[Key]
  set<
    Refinement extends object = Store,
    Key extends keyof Refinement = keyof Refinement,
  >(key: Key, value: Refinement[Key]): void
}

export type SchedulerStoreData<
  Middlewares extends readonly SchedulerMiddleware[],
> = SchedulerStore<Middlewares> & SchedulerRuntimeStore

export type ReviewCardInput<
  Model extends SchedulerModelFactory,
  Middlewares extends readonly SchedulerMiddleware[],
> = Prettify<
  SchemaInput<Model['memoryStateSchema']> &
    SchedulerCoreFieldInput &
    MergeMiddlewareInputs<Middlewares, 'field'>
>

export type ReviewCard<
  Model extends SchedulerModelFactory,
  Middlewares extends readonly SchedulerMiddleware[],
> = Prettify<
  SchemaOutput<Model['memoryStateSchema']> &
    SchedulerCoreFieldOutput &
    MergeMiddlewareOutputs<Middlewares, 'field'>
>

export type SchedulerRevlog<PreviousCard> = Prettify<
  Omit<PreviousCard, 'rating'> & {
    rating: Grade
  }
>

export interface SchedulerReviewInput<
  Model extends SchedulerModelFactory,
  Middlewares extends readonly SchedulerMiddleware[],
> {
  readonly card: ReviewCardInput<Model, Middlewares>
  readonly rating: Grade
  readonly elapsedDays: number
}

export interface NormalizedSchedulerReviewInput<
  Model extends SchedulerModelFactory,
  Middlewares extends readonly SchedulerMiddleware[],
> {
  readonly card: ReviewCard<Model, Middlewares>
  readonly rating: Grade
  readonly elapsedDays: number
}

export interface SchedulerPreviewInput<
  Model extends SchedulerModelFactory,
  Middlewares extends readonly SchedulerMiddleware[],
> {
  readonly card: ReviewCardInput<Model, Middlewares>
  readonly elapsedDays: number
}

export interface SchedulerResetInput<
  Model extends SchedulerModelFactory,
  Middlewares extends readonly SchedulerMiddleware[],
> {
  readonly card: ReviewCardInput<Model, Middlewares>
}

export type SchedulerResetResult<
  Model extends SchedulerModelFactory,
  Middlewares extends readonly SchedulerMiddleware[],
> = ReviewCard<Model, Middlewares>

export type RatingCandidateStore<MemoryState extends FSRSMemoryState> = (
  rating: Grade
) => MemoryState

export interface ReviewContext<
  Model extends SchedulerModelFactory,
  Middlewares extends readonly SchedulerMiddleware[],
> {
  readonly input: NormalizedSchedulerReviewInput<Model, Middlewares>
  readonly config: SchedulerConfig<Model, Middlewares>
  readonly model: ReturnType<Model['create']>
  readonly candidates: RatingCandidateStore<
    SchemaOutput<Model['memoryStateSchema']>
  >
  readonly store: SchedulerStoreAccessor<SchedulerStoreData<Middlewares>>
  readonly result: ReviewResult<Model, Middlewares>
}

export interface ReviewResult<
  Model extends SchedulerModelFactory,
  Middlewares extends readonly SchedulerMiddleware[],
> {
  readonly memoryState: SchemaOutput<Model['memoryStateSchema']>
  card: ReviewCard<Model, Middlewares>
  log: SchedulerRevlog<ReviewCard<Model, Middlewares>>
}

export type PreviewResult<
  Model extends SchedulerModelFactory,
  Middlewares extends readonly SchedulerMiddleware[],
> = {
  readonly [Rating in Grade]: ReviewResult<Model, Middlewares>
}

export interface SchedulerRollbackInput<
  Model extends SchedulerModelFactory,
  Middlewares extends readonly SchedulerMiddleware[],
> {
  readonly card: ReviewCard<Model, Middlewares>
  readonly revlog: SchedulerRevlog<ReviewCard<Model, Middlewares>>
}

export interface RollbackContext<
  Model extends SchedulerModelFactory,
  Middlewares extends readonly SchedulerMiddleware[],
> {
  readonly input: SchedulerRollbackInput<Model, Middlewares>
  readonly config: SchedulerConfig<Model, Middlewares>
  readonly model: ReturnType<Model['create']>
  readonly store: SchedulerStoreAccessor<SchedulerStoreData<Middlewares>>
}

export type MiddlewareSchedulerModel = Pick<
  IFSRSModel<object, FSRSMemoryState>,
  'step' | 'nextInterval' | 'forgettingCurve'
>

type MiddlewareCard<FieldSchema> = Prettify<
  FSRSMemoryState & SchedulerCoreFieldOutput & SchemaOutputOrEmpty<FieldSchema>
>

type MiddlewareStore<StoreSchema> = SchedulerStoreAccessor<
  SchemaOutputOrEmpty<StoreSchema> & SchedulerRuntimeStore
>

export type MiddlewareReviewContext<ConfigSchema, FieldSchema, StoreSchema> = {
  readonly input: {
    readonly card: MiddlewareCard<FieldSchema>
    readonly rating: Grade
    readonly elapsedDays: number
  }
  readonly config: SchemaOutputOrEmpty<ConfigSchema>
  readonly model: MiddlewareSchedulerModel
  readonly candidates: RatingCandidateStore<FSRSMemoryState>
  readonly store: MiddlewareStore<StoreSchema>
  readonly result: MiddlewareReviewResult<FieldSchema>
}

export type MiddlewareReviewResult<FieldSchema> = {
  readonly memoryState: FSRSMemoryState
  card: MiddlewareCard<FieldSchema>
  log: SchedulerRevlog<MiddlewareCard<FieldSchema>>
}

export type MiddlewareRollbackContext<ConfigSchema, FieldSchema, StoreSchema> =
  {
    readonly input: {
      readonly card: MiddlewareCard<FieldSchema>
      readonly revlog: SchedulerRevlog<MiddlewareCard<FieldSchema>>
    }
    readonly config: SchemaOutputOrEmpty<ConfigSchema>
    readonly model: MiddlewareSchedulerModel
    readonly store: MiddlewareStore<StoreSchema>
  }

export type MiddlewareRollbackResult<FieldSchema> = MiddlewareCard<FieldSchema>
