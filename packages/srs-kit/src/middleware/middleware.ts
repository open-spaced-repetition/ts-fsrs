/** biome-ignore-all lint/suspicious/noExplicitAny: type-level widening for AnyMiddleware */

import type { Grade } from '@/primitives/rating.js'
import type {
  AnyObjectSchema,
  Assign,
  Constrain,
  EmptyPart,
  FieldDefault,
  Prettify,
} from '@/schema/index.js'
import type {
  MiddlewareCardInitInputOf,
  MiddlewareContextConfig,
  MiddlewareContextObjectOf,
  MiddlewareEnv,
  MiddlewareResultObjectOf,
  MiddlewareSchemaOf,
} from './infer.js'

export type ReviewMiddlewareResult<Env extends MiddlewareEnv = MiddlewareEnv> =
  {
    readonly card: MiddlewareResultObjectOf<Env, 'card'>
    readonly revlog: MiddlewareResultObjectOf<Env, 'revlog'>
  }

export type RollbackMiddlewareResult<
  Env extends MiddlewareEnv = MiddlewareEnv,
> = {
  readonly card: MiddlewareResultObjectOf<Env, 'card'>
}

export interface MiddlewareContextBase<Env extends MiddlewareEnv> {
  readonly config: MiddlewareContextConfig<Env>
}

export type MiddlewareDefaultValueContext<
  Env extends MiddlewareEnv = MiddlewareEnv,
> = MiddlewareContextBase<Env> &
  (
    | {
        readonly operation: 'newCard'
        readonly input: MiddlewareCardInitInputOf<Env>
      }
    | {
        readonly operation: 'forget'
        readonly input: MiddlewareContextObjectOf<Env, 'card'>
      }
  )

export interface ReviewCandidateContext {
  readonly step: (grade: Grade) => Readonly<Record<string, unknown>>
  readonly nextInterval: (
    memoryState: Readonly<Record<string, unknown>>,
    desiredRetention: number
  ) => number
}

export interface ReviewMiddlewareContext<
  Env extends MiddlewareEnv = MiddlewareEnv,
> extends MiddlewareContextBase<Env> {
  readonly input: {
    readonly card: MiddlewareContextObjectOf<Env, 'card'>
    readonly grade: Grade
    readonly now: unknown
  }
  desiredRetention: number
  readonly elapsedDays: number
  scheduledDays: number | undefined
  readonly candidate: ReviewCandidateContext
  readonly result: ReviewMiddlewareResult<Env>
}

export interface RollbackMiddlewareContext<
  Env extends MiddlewareEnv = MiddlewareEnv,
> extends MiddlewareContextBase<Env> {
  readonly input: {
    readonly card: MiddlewareContextObjectOf<Env, 'card'>
    readonly revlog: MiddlewareContextObjectOf<Env, 'revlog'>
  }
  readonly result: RollbackMiddlewareResult<Env>
}

export type MiddlewareHandler<Context> = (
  ctx: Context,
  next: () => void
) => void

export type ReviewMiddlewareHandler<Env extends MiddlewareEnv = MiddlewareEnv> =
  MiddlewareHandler<ReviewMiddlewareContext<Env>>

export type RollbackMiddlewareHandler<
  Env extends MiddlewareEnv = MiddlewareEnv,
> = MiddlewareHandler<RollbackMiddlewareContext<Env>>

type MiddlewareScheduleStatus<Env extends MiddlewareEnv> = Env extends {
  readonly scheduleStatus: infer Status extends string
}
  ? readonly Status[]
  : undefined

export interface Middleware<
  Name extends PropertyKey = PropertyKey,
  Env extends MiddlewareEnv = MiddlewareEnv,
> {
  readonly name: Name
  readonly scheduleStatus?: MiddlewareScheduleStatus<Env>

  readonly schema?: {
    readonly config?: Env['config']
    readonly cardInitInput?: Env['cardInitInput']
    readonly card?: Env['card']
    readonly revlog?: Env['revlog']
  }

  readonly defaultValue?: {
    readonly card?: FieldDefault<
      MiddlewareSchemaOf<Env, 'card', AnyObjectSchema>,
      MiddlewareDefaultValueContext<Env>
    >

    readonly revlog?: FieldDefault<
      MiddlewareSchemaOf<Env, 'revlog', AnyObjectSchema>,
      MiddlewareDefaultValueContext<Env>
    >
  }

  readonly handlers?: {
    readonly review?: ReviewMiddlewareHandler<Env>
    readonly rollback?: RollbackMiddlewareHandler<Env>
  }
}

export type AnyMiddleware = Middleware<any, any>

type MiddlewareDefinitionSchema = Pick<
  MiddlewareEnv,
  'config' | 'cardInitInput' | 'card' | 'revlog'
>

type MiddlewareStatusEnv<Status extends string> = [Status] extends [never]
  ? EmptyPart
  : { readonly scheduleStatus: Status }

type MiddlewareDefinitionEnv<
  Schema extends MiddlewareDefinitionSchema,
  Status extends string,
> = Constrain<
  Prettify<Assign<MiddlewareStatusEnv<Status>, Schema>>,
  MiddlewareEnv,
  never
>

type MiddlewareDefinition<
  Schema extends MiddlewareDefinitionSchema,
  Name extends PropertyKey,
  Status extends string,
> = {
  readonly name: Name
  readonly scheduleStatus?: readonly Status[]
  readonly schema?: Schema
  readonly defaultValue?: Middleware<
    Name,
    MiddlewareDefinitionEnv<Schema, Status>
  >['defaultValue']
  readonly handlers?: {
    readonly review?: MiddlewareHandler<
      ReviewMiddlewareContext<MiddlewareDefinitionEnv<Schema, Status>>
    >
    readonly rollback?: MiddlewareHandler<
      RollbackMiddlewareContext<MiddlewareDefinitionEnv<Schema, Status>>
    >
  }
}

export function defineMiddleware<
  const Name extends PropertyKey,
  const Schema extends MiddlewareDefinitionSchema = EmptyPart,
  const Status extends string = never,
>(
  definition: MiddlewareDefinition<Schema, Name, Status>
): Middleware<Name, MiddlewareDefinitionEnv<Schema, Status>> {
  return definition as Middleware<Name, MiddlewareDefinitionEnv<Schema, Status>>
}
