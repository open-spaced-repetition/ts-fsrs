import type { AnyChrono } from '@/chrono/chrono.js'
import type {
  ChronoCardOf,
  ChronoConfigPart,
  ChronoRevlogOf,
  ChronoTimeOf,
} from '@/chrono/infer.js'
import type {
  ModelConfigInputOf,
  ModelConfigOf,
  ModelMemoryOf,
} from '@/model/infer.js'
import type { AnyModel } from '@/model/model.js'
import type { ScheduleStatus } from '@/primitives/status.js'
import type {
  Assign,
  MergeAllObjects,
  MergePart,
  Prettify,
  SchemaInput,
  SchemaOutput,
  SchemaOutputOf,
  SRSSchema,
} from '@/schema/index.js'
import type {
  AnyMiddleware,
  MiddlewareCardOf,
  MiddlewareRevlogOf,
  MiddlewareStatusOf,
} from './middleware.js'
import type { MiddlewareConfigPart } from './middleware-config.js'
import type {
  AnyScheduler,
  BlankSchedulerEnv,
  ComposableScheduler,
} from './scheduler.js'

type SchedulerEnvOf<T extends AnyScheduler> =
  T extends ComposableScheduler<infer _Name, infer Env> ? Env : never

export type SchedulerConfigOf<T extends AnyScheduler> = SchemaOutputOf<
  T,
  'config'
>

export type SchedulerConfigInput<
  M extends AnyModel,
  C extends AnyChrono,
  MWs extends readonly AnyMiddleware[],
> = ModelConfigInputOf<M> &
  ChronoConfigPart<C, 'input'> &
  MiddlewareConfigPart<MWs, 'input'>

export type SchedulerConfigOutput<
  M extends AnyModel,
  C extends AnyChrono,
  MWs extends readonly AnyMiddleware[],
> = ModelConfigOf<M> &
  ChronoConfigPart<C, 'output'> &
  MiddlewareConfigPart<MWs, 'output'>

type ExtendSchedulerConfigInput<
  Env extends BlankSchedulerEnv,
  AddedMWs extends readonly AnyMiddleware[],
> = Prettify<
  Assign<SchemaInput<Env['config']>, MiddlewareConfigPart<AddedMWs, 'input'>>
>

type ExtendSchedulerConfigOutput<
  Env extends BlankSchedulerEnv,
  AddedMWs extends readonly AnyMiddleware[],
> = Prettify<
  Assign<SchemaOutput<Env['config']>, MiddlewareConfigPart<AddedMWs, 'output'>>
>

type MiddlewareCardFields<MWs extends readonly AnyMiddleware[]> = MergePart<
  MergeAllObjects<MiddlewareCardOf<MWs[number]>>
>

type ExtendSchedulerCard<
  Env extends BlankSchedulerEnv,
  AddedMWs extends readonly AnyMiddleware[],
> = Prettify<Assign<SchemaOutput<Env['card']>, MiddlewareCardFields<AddedMWs>>>

export type SchedulerCardFields<
  M extends AnyModel,
  C extends AnyChrono,
  MWs extends readonly AnyMiddleware[],
> = Assign<
  Assign<ModelMemoryOf<M>, MergePart<ChronoCardOf<C>>>,
  MiddlewareCardFields<MWs>
>

type MiddlewareRevlogFields<MWs extends readonly AnyMiddleware[]> = MergePart<
  MergeAllObjects<MiddlewareRevlogOf<MWs[number]>>
>

type ExtendSchedulerRevlog<
  Env extends BlankSchedulerEnv,
  AddedMWs extends readonly AnyMiddleware[],
> = Prettify<
  Assign<SchemaOutput<Env['revlog']>, MiddlewareRevlogFields<AddedMWs>>
>

export type SchedulerRevlogFields<
  M extends AnyModel,
  C extends AnyChrono,
  MWs extends readonly AnyMiddleware[],
> = Assign<
  Assign<ModelMemoryOf<M>, MergePart<ChronoRevlogOf<C>>>,
  MiddlewareRevlogFields<MWs>
>

export type SchedulerNameOf<M extends AnyModel> = M extends {
  readonly name: infer Name
}
  ? Extract<Name, string | symbol>
  : never

export type SchedulerEnvFor<
  M extends AnyModel,
  C extends AnyChrono,
  MWs extends readonly AnyMiddleware[],
> = {
  readonly chrono: ChronoTimeOf<C>
  readonly scheduleStatus:
    | ScheduleStatus
    | Extract<MiddlewareStatusOf<MWs[number]>, string>
  readonly config: SRSSchema<{
    input: Prettify<SchedulerConfigInput<M, C, MWs>>
    output: Prettify<SchedulerConfigOutput<M, C, MWs>>
  }>
  readonly card: SRSSchema<{
    input: Prettify<SchedulerCardFields<M, C, MWs>>
    output: Prettify<SchedulerCardFields<M, C, MWs>>
  }>
  readonly revlog: SRSSchema<{
    input: Prettify<SchedulerRevlogFields<M, C, MWs>>
    output: Prettify<SchedulerRevlogFields<M, C, MWs>>
  }>
}

export type ExtendSchedulerEnv<
  Env extends BlankSchedulerEnv,
  AddedMWs extends readonly AnyMiddleware[],
> = {
  readonly chrono: Env['chrono']
  readonly scheduleStatus:
    | Extract<Env['scheduleStatus'], string>
    | Extract<MiddlewareStatusOf<AddedMWs[number]>, string>
  readonly config: SRSSchema<{
    input: ExtendSchedulerConfigInput<Env, AddedMWs>
    output: ExtendSchedulerConfigOutput<Env, AddedMWs>
  }>
  readonly card: SRSSchema<{
    input: ExtendSchedulerCard<Env, AddedMWs>
    output: ExtendSchedulerCard<Env, AddedMWs>
  }>
  readonly revlog: SRSSchema<{
    input: ExtendSchedulerRevlog<Env, AddedMWs>
    output: ExtendSchedulerRevlog<Env, AddedMWs>
  }>
}

export type SchedulerCardOf<T extends AnyScheduler> = SchemaOutput<
  SchedulerEnvOf<T>['card']
>

export type SchedulerRevlogOf<T extends AnyScheduler> = SchemaOutputOf<
  T,
  'revlog'
>

export type SchedulerTimeOf<T extends AnyScheduler> =
  SchedulerEnvOf<T>['chrono']

export type SchedulerStatusOf<T extends AnyScheduler> =
  SchedulerEnvOf<T>['scheduleStatus']
