/** biome-ignore-all lint/suspicious/noExplicitAny: type-level widening for AnyChrono */
import type { StandardSchemaV1 } from '@vendor/standard-schema.js'
import type {
  AnyObjectSchema,
  AnySchema,
  emptyObjectSchema,
  FieldDefault,
  SchemaOutput,
} from '../schema/index.js'

// ==========
// Chrono Core
// ==========
export interface ChronoCore<Time> {
  /**
   * Returns the distance from the previous review time to the current time.
   * When `from` is `null`, this must return `0`.
   */
  readonly difference: (from: Time | null, to: Time) => number
  readonly add: (from: Time, days: number) => Time
}

export type AnyChronoCore = ChronoCore<any>

// ==========
// Chrono
// ==========
export interface ChronoDefaultCtx<Config, Value> {
  readonly config: Readonly<Config>
  readonly time: Value
  readonly previous?: Readonly<ChronoTimeProjection<Value>>
}

export type BlankChronoEnv = {
  readonly time: AnySchema
  readonly config: AnySchema
  readonly fields: {
    readonly card: AnyObjectSchema
    readonly revlog: AnyObjectSchema
  }
}

export interface ChronoSchema<Env extends BlankChronoEnv = BlankChronoEnv> {
  readonly config: Env['config']
  readonly time: Env['time']
  readonly card: Env['fields']['card']
  readonly revlog: Env['fields']['revlog']
}

export type ChronoDefaultValue<Env extends BlankChronoEnv = BlankChronoEnv> =
  Readonly<{
    readonly card?: FieldDefault<
      Env['fields']['card'],
      ChronoDefaultCtx<SchemaOutput<Env['config']>, SchemaOutput<Env['time']>>
    >
    readonly revlog?: FieldDefault<
      Env['fields']['revlog'],
      ChronoDefaultCtx<SchemaOutput<Env['config']>, SchemaOutput<Env['time']>>
    >
  }>

export type ChronoCreate<Env extends BlankChronoEnv = BlankChronoEnv> =
  Env['config'] extends typeof emptyObjectSchema
    ? (ctx?: {
        readonly config: SchemaOutput<Env['config']>
      }) => ChronoCore<SchemaOutput<Env['time']>>
    : (ctx: {
        readonly config: SchemaOutput<Env['config']>
      }) => ChronoCore<SchemaOutput<Env['time']>>

export interface ChronoTimeProjection<Value> {
  readonly previous: Value | null
  readonly current: Value
}

export type ChronoProjectionInput<Time, CardFields = never> = [
  CardFields,
] extends [never]
  ? { readonly time: Time }
  : { readonly card: Readonly<CardFields>; readonly time: Time }

export type ChronoProjection<Env extends BlankChronoEnv = BlankChronoEnv> =
  StandardSchemaV1<
    ChronoProjectionInput<
      SchemaOutput<Env['time']>,
      Env['fields']['card'] extends typeof emptyObjectSchema
        ? never
        : SchemaOutput<Env['fields']['card']>
    >,
    ChronoTimeProjection<SchemaOutput<Env['time']>>
  >

export interface Chrono<Env extends BlankChronoEnv = BlankChronoEnv> {
  readonly schema: ChronoSchema<Env>
  readonly projection: ChronoProjection<Env>
  readonly defaultValue: ChronoDefaultValue<Env>
  readonly create: ChronoCreate<Env>
}

export type AnyChrono = Chrono<{
  readonly time: any
  readonly config: any
  readonly fields: { readonly card: any; readonly revlog: any }
}>
