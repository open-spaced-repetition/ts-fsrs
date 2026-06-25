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

type ChronoProjectionValidator<Time> = (
  value: unknown
) => StandardSchemaV1.Result<ChronoTimeProjection<Time>>

export function defineChronoProjection<CardFields, Time>(
  validate: (
    value: ChronoProjectionInput<CardFields, Time>
  ) => StandardSchemaV1.Result<ChronoTimeProjection<Time>>
) {
  return defineSchema<
    ChronoProjectionInput<CardFields, Time>,
    ChronoTimeProjection<Time>
  >(validate as ChronoProjectionValidator<Time>)
}

type ChronoProjectionDefinition<
  TimeSchema extends AnySchema,
  CardSchema extends AnyObjectSchema,
> =
  | StandardSchemaV1<
      ChronoProjectionInput<SchemaOutput<CardSchema>, SchemaOutput<TimeSchema>>,
      ChronoTimeProjection<SchemaOutput<TimeSchema>>
    >
  | ((
      value: ChronoProjectionInput<
        SchemaOutput<CardSchema>,
        SchemaOutput<TimeSchema>
      >
    ) => StandardSchemaV1.Result<
      ChronoTimeProjection<SchemaOutput<TimeSchema>>
    >)

function resolveChronoProjection(
  projection: ChronoProjectionDefinition<AnySchema, AnyObjectSchema>
) {
  if (typeof projection === 'function') {
    return defineChronoProjection(projection)
  }

  return projection
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
  readonly defaultValue?: ChronoDefaultValue<{
    readonly time: TimeSchema
    readonly config: ConfigSchema
    readonly fields: {
      readonly card: CardSchema
      readonly revlog: RevlogSchema
    }
  }>
  readonly projection: ChronoProjectionDefinition<TimeSchema, CardSchema>
  readonly create: ChronoCreate<{
    readonly time: TimeSchema
    readonly config: ConfigSchema
    readonly fields: {
      readonly card: CardSchema
      readonly revlog: RevlogSchema
    }
  }>
}): Chrono<{
  readonly time: TimeSchema
  readonly config: ConfigSchema
  readonly fields: {
    readonly card: CardSchema
    readonly revlog: RevlogSchema
  }
}>
export function defineChrono(definition: {
  readonly schema: {
    readonly config?: AnySchema
    readonly card?: AnyObjectSchema
    readonly revlog?: AnyObjectSchema
    readonly time: AnySchema
  }
  readonly projection: ChronoProjectionDefinition<AnySchema, AnyObjectSchema>
  readonly defaultValue?: unknown
  readonly create: unknown
}): unknown {
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
  }
}
