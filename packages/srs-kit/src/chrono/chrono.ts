/** biome-ignore-all lint/suspicious/noExplicitAny: type-level widening for AnyChrono */
import type { StandardSchemaV1 } from '@vendor/standard-schema.js'
import type {
  AnyObjectSchema,
  AnySchema,
  EmptyPart,
  emptyObjectSchema,
  FieldDefault,
  SchemaInput,
  SchemaOutput,
} from '../schema/index.js'

// ==========
// Chrono Core
// ==========
export interface ChronoCore<Time> {
  readonly now: () => Time
  /**
   * Returns the distance from the previous review time to the current time.
   */
  readonly difference: (from: Time, to: Time) => number
  readonly add: (from: Time, days: number) => Time
}

export type AnyChronoCore = ChronoCore<any>

// ==========
// Chrono Environment
// ==========
export type BlankChronoEnv = {
  readonly time: AnySchema
  readonly config?: AnySchema
  readonly fields: {
    readonly card?: AnyObjectSchema
    readonly revlog?: AnyObjectSchema
  }
}

type ChronoConfigSchema<Env extends BlankChronoEnv> = Env extends {
  readonly config: infer Config
}
  ? Extract<Config, AnySchema>
  : never

type ChronoFieldSchema<
  Env extends BlankChronoEnv,
  Key extends keyof BlankChronoEnv['fields'],
> = Extract<Env['fields'][Key], AnyObjectSchema>

type ChronoConfig<Env extends BlankChronoEnv> = [
  ChronoConfigSchema<Env>,
] extends [never]
  ? Record<string, never>
  : SchemaOutput<ChronoConfigSchema<Env>>

type ChronoPart<Key extends PropertyKey, Value> = [Value] extends [never]
  ? EmptyPart
  : { readonly [K in Key]: Value }

type ChronoSchemaFields<Env extends BlankChronoEnv> = ChronoPart<
  'card',
  ChronoFieldSchema<Env, 'card'>
> &
  ChronoPart<'revlog', ChronoFieldSchema<Env, 'revlog'>>

// ==========
// Chrono Projection
// ==========
export interface ChronoTimeProjection<Time> {
  readonly previous: Time
  readonly current: Time
}

export type ChronoProjectionInput<Time, CardFields = never> = [
  CardFields,
] extends [never]
  ? { readonly time: Time }
  : { readonly card: Readonly<CardFields>; readonly time: Time }

type ChronoProjectedCard<Env extends BlankChronoEnv> = [
  ChronoFieldSchema<Env, 'card'>,
] extends [never]
  ? never
  : SchemaInput<ChronoFieldSchema<Env, 'card'>>

export type ChronoProjection<Env extends BlankChronoEnv = BlankChronoEnv> =
  StandardSchemaV1<
    ChronoProjectionInput<SchemaOutput<Env['time']>, ChronoProjectedCard<Env>>,
    ChronoTimeProjection<SchemaOutput<Env['time']>>
  >

// ==========
// Chrono
// ==========
export interface ChronoDefaultCtx<Config, Value> {
  readonly config: Readonly<Config>
  readonly time: Value
  readonly previous?: Readonly<ChronoTimeProjection<Value>>
}

export type ChronoSchema<Env extends BlankChronoEnv = BlankChronoEnv> = {
  readonly time: Env['time']
} & ChronoPart<'config', ChronoConfigSchema<Env>> &
  ChronoSchemaFields<Env>

type ChronoDefaultPart<
  Env extends BlankChronoEnv,
  Key extends 'card' | 'revlog',
> = [ChronoFieldSchema<Env, Key>] extends [never]
  ? EmptyPart
  : {
      readonly [K in Key]?: FieldDefault<
        ChronoFieldSchema<Env, Key>,
        ChronoDefaultCtx<ChronoConfig<Env>, SchemaOutput<Env['time']>>
      >
    }

export type ChronoDefaultValue<Env extends BlankChronoEnv = BlankChronoEnv> =
  Readonly<
    ChronoDefaultPart<Env, 'card'> & ChronoDefaultPart<Env, 'revlog'>
  >

export type ChronoCreate<Env extends BlankChronoEnv = BlankChronoEnv> = [
  ChronoConfigSchema<Env>,
] extends [never]
  ? () => ChronoCore<SchemaOutput<Env['time']>>
  : ChronoConfigSchema<Env> extends typeof emptyObjectSchema
    ? (ctx?: {
        readonly config: SchemaOutput<ChronoConfigSchema<Env>>
      }) => ChronoCore<SchemaOutput<Env['time']>>
    : (ctx: {
        readonly config: SchemaOutput<ChronoConfigSchema<Env>>
      }) => ChronoCore<SchemaOutput<Env['time']>>

export interface Chrono<Env extends BlankChronoEnv = BlankChronoEnv> {
  readonly schema: ChronoSchema<Env>
  readonly projection: ChronoProjection<Env>
  readonly defaultValue: ChronoDefaultValue<Env>
  readonly create: ChronoCreate<Env>
}

export type AnyChrono = Chrono<any>
