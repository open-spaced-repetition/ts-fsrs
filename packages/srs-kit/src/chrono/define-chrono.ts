import type { StandardSchemaV1 } from '@vendor/standard-schema.js'
import {
  type AnyObjectSchema,
  type AnySchema,
  defineSchema,
  type EmptyPart,
  type SchemaInput,
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
  readonly revlog?: unknown
  readonly time: unknown
}

type ChronoProjectionInputOf<Input extends ChronoProjectionDefinitionInput> =
  ChronoProjectionInput<
    Input['time'],
    Input extends { readonly card: infer Card } ? Card : never,
    Input extends { readonly revlog: infer Revlog } ? Revlog : never
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
  CardSchema extends AnyObjectSchema | undefined,
  RevlogSchema extends AnyObjectSchema | undefined,
> = ChronoProjectionInput<
  SchemaOutput<TimeSchema>,
  CardSchema extends AnyObjectSchema ? SchemaInput<CardSchema> : never,
  RevlogSchema extends AnyObjectSchema ? SchemaInput<RevlogSchema> : never
>

type ChronoProjectionDefinition<
  TimeSchema extends AnySchema,
  CardSchema extends AnyObjectSchema | undefined,
  RevlogSchema extends AnyObjectSchema | undefined,
> =
  | StandardSchemaV1<
      ChronoProjectionInputFor<TimeSchema, CardSchema, RevlogSchema>,
      ChronoTimeProjection<SchemaOutput<TimeSchema>>
    >
  | ((
      value: ChronoProjectionInputFor<TimeSchema, CardSchema, RevlogSchema>
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

type ChronoDefinitionSchema = {
  readonly time: AnySchema
  readonly config?: AnySchema
  readonly card?: AnyObjectSchema
  readonly revlog?: AnyObjectSchema
}

type ChronoDefinitionConfig<Schema extends ChronoDefinitionSchema> =
  Schema extends { readonly config: infer Config extends AnySchema }
    ? { readonly config: Config }
    : EmptyPart

type ChronoDefinitionFields<Schema extends ChronoDefinitionSchema> =
  (Schema extends { readonly card: infer Card extends AnyObjectSchema }
    ? { readonly card: Card }
    : EmptyPart) &
    (Schema extends { readonly revlog: infer Revlog extends AnyObjectSchema }
      ? { readonly revlog: Revlog }
      : EmptyPart)

type ChronoDefinitionEnv<Schema extends ChronoDefinitionSchema> = {
  readonly time: Schema['time']
  readonly fields: ChronoDefinitionFields<Schema>
} & ChronoDefinitionConfig<Schema>

type ChronoDefinitionCard<Schema extends ChronoDefinitionSchema> =
  Schema extends { readonly card: infer Card extends AnyObjectSchema }
    ? Card
    : undefined

type ChronoDefinitionRevlog<Schema extends ChronoDefinitionSchema> =
  Schema extends { readonly revlog: infer Revlog extends AnyObjectSchema }
    ? Revlog
    : undefined

type ChronoDefinition<Schema extends ChronoDefinitionSchema> = {
  readonly schema: Schema
  readonly defaultValue?: ChronoDefaultValue<ChronoDefinitionEnv<Schema>>
  readonly projection: ChronoProjectionDefinition<
    Schema['time'],
    ChronoDefinitionCard<Schema>,
    ChronoDefinitionRevlog<Schema>
  >
  readonly create: ChronoCreate<ChronoDefinitionEnv<Schema>>
}

export function defineChrono<const Schema extends ChronoDefinitionSchema>(
  definition: ChronoDefinition<Schema>
): Chrono<{
  readonly [Key in keyof ({
    readonly time: Schema['time']
  } & ChronoDefinitionConfig<Schema> & {
      readonly fields: {
        readonly [Field in keyof ChronoDefinitionFields<Schema>]: ChronoDefinitionFields<Schema>[Field]
      }
    })]: ({
    readonly time: Schema['time']
  } & ChronoDefinitionConfig<Schema> & {
      readonly fields: {
        readonly [Field in keyof ChronoDefinitionFields<Schema>]: ChronoDefinitionFields<Schema>[Field]
      }
    })[Key]
}> {
  return {
    schema: {
      time: definition.schema.time,
      ...(definition.schema.config ? { config: definition.schema.config } : {}),
      ...(definition.schema.card ? { card: definition.schema.card } : {}),
      ...(definition.schema.revlog ? { revlog: definition.schema.revlog } : {}),
    },
    projection: resolveChronoProjection(definition.projection),
    defaultValue: definition.defaultValue ?? {},
    create: definition.create,
  } as unknown as Chrono<ChronoDefinitionEnv<Schema>>
}
