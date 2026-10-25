import type { AnyChrono } from '@/chrono/chrono.js'
import type {
  ChronoCardOf,
  ChronoConfigPart,
  ChronoRevlogOf,
  ChronoTimeOf,
} from '@/chrono/infer.js'
import type { MiddlewareConfigPart } from '@/middleware/config.js'
import type {
  AnyMiddleware,
  MiddlewareCardInitInputResolveOf,
  MiddlewareCardOf,
  MiddlewareRevlogOf,
  MiddlewareStatusOf,
} from '@/middleware/index.js'
import type {
  ModelConfigInputOf,
  ModelConfigOf,
  ModelMemoryOf,
} from '@/model/infer.js'
import type { AnyModel } from '@/model/model.js'
import type { ScheduleStatus } from '@/primitives/status.js'
import type {
  AnySchema,
  Assign,
  AssignFields,
  HasSchema,
  MergeAllObjects,
  MergePart,
  Mutable,
  Prettify,
  SchemaInput,
  SchemaInputOf,
  SchemaOutput,
  SchemaOutputOf,
  SRSSchema,
} from '@/schema/index.js'
import type {
  SchedulerCoreFields,
  SchedulerRevlogCoreFields,
} from './fields.js'
import type { BlankSchedulerEnv, SchedulerCardInitSchema } from './scheduler.js'

export type SchedulerConfigOf<T extends HasSchema<'config'>> = SchemaOutputOf<
  T,
  'config'
>

export type SchedulerConfigInputOf<T extends HasSchema<'config'>> = {
  [Key in keyof SchemaInputOf<T, 'config'>]: SchemaInputOf<T, 'config'>[Key]
}

export type SchedulerConfigOutputOf<T extends HasSchema<'config'>> = {
  [Key in keyof SchemaOutputOf<T, 'config'>]: SchemaOutputOf<T, 'config'>[Key]
}

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

// Scheduler Env schemas are SRSSchema, so read their type arguments directly.
// SchemaInput/SchemaOutput go through '~standard' (an Omit intersection), and
// paying that on every chained use() exceeds the instantiation depth (TS2589).
type EnvSchemaInput<S extends AnySchema> =
  S extends SRSSchema<infer Definition> ? Definition['input'] : SchemaInput<S>

type EnvSchemaOutput<S extends AnySchema> =
  S extends SRSSchema<infer Definition> ? Definition['output'] : SchemaOutput<S>

type ExtendSchedulerConfig<
  Env extends BlankSchedulerEnv,
  AddedMWs extends readonly AnyMiddleware[],
> = [
  | keyof MiddlewareConfigPart<AddedMWs, 'input'>
  | keyof MiddlewareConfigPart<AddedMWs, 'output'>,
] extends [never]
  ? Env['config']
  : SRSSchema<{
      input: AssignFields<
        EnvSchemaInput<Env['config']>,
        MiddlewareConfigPart<AddedMWs, 'input'>,
        'preserve'
      >
      output: AssignFields<
        EnvSchemaOutput<Env['config']>,
        MiddlewareConfigPart<AddedMWs, 'output'>,
        'preserve'
      >
    }>

type MiddlewareCardInitInputFields<
  MWs extends readonly AnyMiddleware[],
  Mode extends 'input' | 'output',
> = MergePart<
  MergeAllObjects<MiddlewareCardInitInputResolveOf<MWs[number], Mode>>
>

type ExtendSchedulerCardInitInput<
  Env extends BlankSchedulerEnv,
  AddedMWs extends readonly AnyMiddleware[],
> = AssignFields<
  EnvSchemaInput<Env['cardInitInput']>,
  Assign<
    MiddlewareCardInitInputFields<AddedMWs, 'input'>,
    { readonly now?: Env['chrono'] }
  >,
  'preserve'
>

type SchedulerCardInitOutput<Env extends BlankSchedulerEnv> = EnvSchemaOutput<
  Env['cardInitInput']
>['input']

type ExtendSchedulerCardInitOutput<
  Env extends BlankSchedulerEnv,
  AddedMWs extends readonly AnyMiddleware[],
> = AssignFields<
  SchedulerCardInitOutput<Env>,
  MiddlewareCardInitInputFields<AddedMWs, 'output'>,
  'preserve'
>

type ExtendSchedulerCardInitSchema<
  Env extends BlankSchedulerEnv,
  AddedMWs extends readonly AnyMiddleware[],
> = [
  | keyof MiddlewareCardInitInputFields<AddedMWs, 'input'>
  | keyof MiddlewareCardInitInputFields<AddedMWs, 'output'>,
] extends [never]
  ? Env['cardInitInput']
  : SRSSchema<{
      input: ExtendSchedulerCardInitInput<Env, AddedMWs>
      output: {
        readonly input: ExtendSchedulerCardInitOutput<Env, AddedMWs>
        readonly now?: unknown
      }
    }>

type SchedulerObjectKey = 'card' | 'revlog'

type MiddlewareObjectFields<
  MWs extends readonly AnyMiddleware[],
  Key extends SchedulerObjectKey,
  Mode extends 'input' | 'output' = 'output',
> = MergePart<
  MergeAllObjects<
    Key extends 'card'
      ? MiddlewareCardOf<MWs[number], Mode>
      : MiddlewareRevlogOf<MWs[number], Mode>
  >
>

type SchedulerCoreFieldsFor<
  Key extends SchedulerObjectKey,
  Status extends string,
> = Key extends 'card'
  ? SchedulerCoreFields<Status>
  : SchedulerRevlogCoreFields<Status>

type MiddlewareScheduleStatus<MWs extends readonly AnyMiddleware[]> =
  MiddlewareStatusOf<MWs[number]>

type ExtendSchedulerObject<
  Env extends BlankSchedulerEnv,
  AddedMWs extends readonly AnyMiddleware[],
  Key extends SchedulerObjectKey,
  Mode extends 'input' | 'output',
> = AssignFields<
  Mode extends 'input' ? EnvSchemaInput<Env[Key]> : EnvSchemaOutput<Env[Key]>,
  Assign<
    MiddlewareObjectFields<AddedMWs, Key, Mode>,
    SchedulerCoreFieldsFor<
      Key,
      Env['scheduleStatus'] | MiddlewareScheduleStatus<AddedMWs>
    >
  >,
  Mode extends 'input' ? 'readonly' : 'mutable'
>

type ChronoObjectFields<
  C extends AnyChrono,
  Key extends SchedulerObjectKey,
> = Key extends 'card' ? ChronoCardOf<C> : ChronoRevlogOf<C>

type SchedulerObjectFields<
  M extends AnyModel,
  C extends AnyChrono,
  MWs extends readonly AnyMiddleware[],
  Key extends SchedulerObjectKey,
  Mode extends 'input' | 'output' = 'output',
> = Assign<
  Assign<
    Assign<ModelMemoryOf<M>, MergePart<ChronoObjectFields<C, Key>>>,
    MiddlewareObjectFields<MWs, Key, Mode>
  >,
  SchedulerCoreFieldsFor<Key, ScheduleStatus | MiddlewareScheduleStatus<MWs>>
>

export type SchedulerCardFields<
  M extends AnyModel,
  C extends AnyChrono,
  MWs extends readonly AnyMiddleware[],
> = Mutable<SchedulerObjectFields<M, C, MWs, 'card'>>

export type SchedulerRevlogFields<
  M extends AnyModel,
  C extends AnyChrono,
  MWs extends readonly AnyMiddleware[],
> = Mutable<SchedulerObjectFields<M, C, MWs, 'revlog'>>

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
  readonly scheduleStatus: ScheduleStatus | MiddlewareScheduleStatus<MWs>
  readonly config: SRSSchema<{
    input: Prettify<SchedulerConfigInput<M, C, MWs>>
    output: Prettify<SchedulerConfigOutput<M, C, MWs>>
  }>
  readonly cardInitInput: [
    | keyof MiddlewareCardInitInputFields<MWs, 'input'>
    | keyof MiddlewareCardInitInputFields<MWs, 'output'>,
  ] extends [never]
    ? SchedulerCardInitSchema<ChronoTimeOf<C>>
    : SchedulerCardInitSchema<
        ChronoTimeOf<C>,
        MiddlewareCardInitInputFields<MWs, 'input'>,
        MiddlewareCardInitInputFields<MWs, 'output'>
      >
  readonly card: SRSSchema<{
    input: Prettify<Readonly<SchedulerObjectFields<M, C, MWs, 'card', 'input'>>>
    output: Prettify<SchedulerCardFields<M, C, MWs>>
  }>
  readonly revlog: SRSSchema<{
    input: Prettify<
      Readonly<SchedulerObjectFields<M, C, MWs, 'revlog', 'input'>>
    >
    output: Prettify<SchedulerRevlogFields<M, C, MWs>>
  }>
}

export type ExtendSchedulerEnv<
  Env extends BlankSchedulerEnv,
  AddedMWs extends readonly AnyMiddleware[],
> = {
  readonly chrono: Env['chrono']
  readonly scheduleStatus:
    | Env['scheduleStatus']
    | MiddlewareScheduleStatus<AddedMWs>
  readonly config: ExtendSchedulerConfig<Env, AddedMWs>
  readonly cardInitInput: ExtendSchedulerCardInitSchema<Env, AddedMWs>
  readonly card: SRSSchema<{
    input: ExtendSchedulerObject<Env, AddedMWs, 'card', 'input'>
    output: ExtendSchedulerObject<Env, AddedMWs, 'card', 'output'>
  }>
  readonly revlog: SRSSchema<{
    input: ExtendSchedulerObject<Env, AddedMWs, 'revlog', 'input'>
    output: ExtendSchedulerObject<Env, AddedMWs, 'revlog', 'output'>
  }>
}

export type SchedulerCardOf<T extends HasSchema<'card'>> = SchemaOutputOf<
  T,
  'card'
>

export type SchedulerCardInitInputOf<T extends HasSchema<'cardInitInput'>> =
  SchemaInputOf<T, 'cardInitInput'>

export type SchedulerCardInputOf<T extends HasSchema<'card'>> = SchemaInputOf<
  T,
  'card'
>

export type SchedulerRevlogOf<T extends HasSchema<'revlog'>> = SchemaOutputOf<
  T,
  'revlog'
>

export type SchedulerRevlogInputOf<T extends HasSchema<'revlog'>> =
  SchemaInputOf<T, 'revlog'>

export type SchedulerTimeOf<T extends HasSchema<'cardInitInput'>> =
  SchedulerCardInitInputOf<T> extends { readonly now?: infer Time }
    ? Exclude<Time, undefined>
    : never

export type SchedulerStatusOf<T extends HasSchema<'scheduleStatus'>> =
  SchemaOutputOf<T, 'scheduleStatus'>
