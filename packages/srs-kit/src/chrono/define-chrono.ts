import type { StandardSchemaV1 } from '@vendor/standard-schema.js'
import {
  type AnyObjectSchema,
  type AnySchema,
  defineSchema,
  emptyObjectSchema,
  type SchemaOutput,
} from '../schema/index.js'
import type {
  Chrono,
  ChronoCreate,
  ChronoDefaultValue,
  ChronoProjectionInput,
  ChronoTimeProjection,
} from './chrono.js'

type ChronoProjectionDefinitionInput = {
  readonly card?: unknown
  readonly time: unknown
}

type ChronoProjectionInputOf<Input extends ChronoProjectionDefinitionInput> =
  ChronoProjectionInput<
    Input['time'],
    Input extends { readonly card: infer Card } ? Card : never
  >

export function defineChronoProjection<
  Input extends ChronoProjectionDefinitionInput,
>(
  validate: (
    value: ChronoProjectionInputOf<Input>
  ) => StandardSchemaV1.Result<ChronoTimeProjection<Input['time']>>
) {
  return defineSchema<
    ChronoProjectionInputOf<Input>,
    ChronoTimeProjection<Input['time']>
  >(
    validate as (
      value: unknown
    ) => StandardSchemaV1.Result<ChronoTimeProjection<Input['time']>>
  )
}

type ChronoProjectionInputFor<
  TimeSchema extends AnySchema,
  CardSchema extends AnyObjectSchema,
> = ChronoProjectionInput<
  SchemaOutput<TimeSchema>,
  CardSchema extends typeof emptyObjectSchema ? never : SchemaOutput<CardSchema>
>

type ChronoProjectionDefinition<
  TimeSchema extends AnySchema,
  CardSchema extends AnyObjectSchema,
> =
  | StandardSchemaV1<
      ChronoProjectionInputFor<TimeSchema, CardSchema>,
      ChronoTimeProjection<SchemaOutput<TimeSchema>>
    >
  | ((
      value: ChronoProjectionInputFor<TimeSchema, CardSchema>
    ) => StandardSchemaV1.Result<
      ChronoTimeProjection<SchemaOutput<TimeSchema>>
    >)

function resolveChronoProjection(projection: unknown) {
  if (typeof projection === 'function') {
    return defineChronoProjection(
      projection as (
        value: ChronoProjectionInput<unknown>
      ) => StandardSchemaV1.Result<ChronoTimeProjection<unknown>>
    )
  }

  return projection
}

type ChronoEnv<
  TimeSchema extends AnySchema,
  ConfigSchema extends AnySchema,
  CardSchema extends AnyObjectSchema,
  RevlogSchema extends AnyObjectSchema,
> = {
  readonly time: TimeSchema
  readonly config: ConfigSchema
  readonly fields: {
    readonly card: CardSchema
    readonly revlog: RevlogSchema
  }
}

export function defineChrono<
  const TimeSchema extends AnySchema,
  const ConfigSchema extends AnySchema = typeof emptyObjectSchema,
  const CardSchema extends AnyObjectSchema = typeof emptyObjectSchema,
  const RevlogSchema extends AnyObjectSchema = typeof emptyObjectSchema,
>(definition: {
  readonly schema: {
    readonly time: TimeSchema
    readonly config?: ConfigSchema
    readonly card?: CardSchema
    readonly revlog?: RevlogSchema
  }
  readonly defaultValue?: ChronoDefaultValue<
    ChronoEnv<TimeSchema, ConfigSchema, CardSchema, RevlogSchema>
  >
  readonly projection: ChronoProjectionDefinition<TimeSchema, CardSchema>
  readonly create: ChronoCreate<
    ChronoEnv<TimeSchema, ConfigSchema, CardSchema, RevlogSchema>
  >
}) {
  return {
    schema: {
      config: definition.schema.config ?? emptyObjectSchema,
      card: definition.schema.card ?? emptyObjectSchema,
      revlog: definition.schema.revlog ?? emptyObjectSchema,
      time: definition.schema.time,
    },
    projection: resolveChronoProjection(definition.projection),
    defaultValue: definition.defaultValue ?? {},
    create: definition.create,
  } as Chrono<{
    readonly time: TimeSchema
    readonly config: ConfigSchema
    readonly fields: {
      readonly card: CardSchema
      readonly revlog: RevlogSchema
    }
  }>
}
