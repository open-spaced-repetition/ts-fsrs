/** biome-ignore-all lint/suspicious/noExplicitAny: type-level widening for AnyMiddleware */

import type { Grade } from '@/primitives/rating.js'
import type { State } from '@/primitives/state.js'
import type {
  AnyObjectSchema,
  AnySchema,
  Assign,
  EmptyPart,
  IntersectAssign,
  Mutable,
  Prettify,
  SchemaInput,
  SchemaOutput,
} from '@/schema/index.js'
import type { Middleware } from './middleware.js'

export type MiddlewareEnv = {
  readonly config?: AnySchema
  readonly cardInitInput?: AnyObjectSchema
  readonly card?: AnyObjectSchema
  readonly revlog?: AnyObjectSchema
  readonly scheduleStatus?: string
}

export type MiddlewareSchemaOf<
  Env extends MiddlewareEnv,
  Key extends keyof MiddlewareEnv,
  Schema extends AnySchema,
> = Extract<Env[Key], Schema>

type MiddlewareSchemaResolveOf<
  Env extends MiddlewareEnv,
  Key extends keyof MiddlewareEnv,
  Schema extends AnySchema,
  Mode extends 'input' | 'output' = 'output',
> = [MiddlewareSchemaOf<Env, Key, Schema>] extends [never]
  ? EmptyPart
  : Mode extends 'input'
    ? SchemaInput<MiddlewareSchemaOf<Env, Key, Schema>>
    : SchemaOutput<MiddlewareSchemaOf<Env, Key, Schema>>

export type MiddlewareConfigOf<Env extends MiddlewareEnv> =
  MiddlewareSchemaResolveOf<Env, 'config', AnySchema>

export type MiddlewareCardInitInputOf<
  Env extends MiddlewareEnv,
  Mode extends 'input' | 'output' = 'output',
> = MiddlewareSchemaResolveOf<Env, 'cardInitInput', AnyObjectSchema, Mode>

export type MiddlewareRuntimeConfig = Readonly<Record<PropertyKey, unknown>>

type SchedulerCoreFields<ScheduleStatus extends string = string> = {
  readonly state: State
  readonly scheduleStatus: ScheduleStatus
}

type SchedulerRevlogCoreFields<ScheduleStatus extends string = string> =
  SchedulerCoreFields<ScheduleStatus> & {
    readonly rating: Grade
  }

export type MiddlewareContextConfig<Env extends MiddlewareEnv> =
  MiddlewareRuntimeConfig &
    Readonly<
      Assign<
        MiddlewareConfigOf<Env>,
        {
          readonly chrono: unknown
        }
      >
    >

export type MiddlewareContextObjectOf<
  Env extends MiddlewareEnv,
  Key extends 'card' | 'revlog',
> = Prettify<
  Assign<
    MiddlewareSchemaResolveOf<Env, Key, AnyObjectSchema>,
    Key extends 'card' ? SchedulerCoreFields : SchedulerRevlogCoreFields
  >
>

export type MiddlewareResultObjectOf<
  Env extends MiddlewareEnv,
  Key extends 'card' | 'revlog',
> = Prettify<
  Partial<Mutable<MiddlewareContextObjectOf<Env, Key>>> &
    Record<string, unknown>
>

type MiddlewareObjectOf<
  TMiddleware,
  Key extends 'card' | 'revlog',
  Mode extends 'input' | 'output' = 'output',
> =
  TMiddleware extends Middleware<any, infer Env>
    ? Mode extends 'input'
      ? IntersectAssign<
          MiddlewareSchemaResolveOf<Env, Key, AnyObjectSchema, 'input'>,
          Partial<
            MiddlewareSchemaResolveOf<Env, Key, AnyObjectSchema, 'output'>
          >
        >
      : MiddlewareSchemaResolveOf<Env, Key, AnyObjectSchema, 'output'>
    : never

export type MiddlewareCardOf<
  TMiddleware,
  Mode extends 'input' | 'output' = 'output',
> = MiddlewareObjectOf<TMiddleware, 'card', Mode>

export type MiddlewareRevlogOf<
  TMiddleware,
  Mode extends 'input' | 'output' = 'output',
> = MiddlewareObjectOf<TMiddleware, 'revlog', Mode>

export type MiddlewareCardInitInputResolveOf<
  TMiddleware,
  Mode extends 'input' | 'output' = 'output',
> =
  TMiddleware extends Middleware<any, infer Env>
    ? MiddlewareCardInitInputOf<Env, Mode>
    : never

export type MiddlewareConfigResolveOf<
  TMiddleware,
  Mode extends 'input' | 'output' = 'output',
> =
  TMiddleware extends Middleware<any, infer Env>
    ? MiddlewareSchemaResolveOf<Env, 'config', AnySchema, Mode>
    : never

export type MiddlewareStatusOf<TMiddleware> =
  TMiddleware extends Middleware<any, infer Env>
    ? Env extends { readonly scheduleStatus: infer Status extends string }
      ? Status
      : never
    : never
