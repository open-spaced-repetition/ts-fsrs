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
  AnyChronoSchema,
  Chrono,
  ChronoCreate,
  ChronoDefaultValue,
  ChronoNormalizedTime,
  ChronoTimeNormalizerInput,
} from './chrono.js'

type ChronoTimeNormalizerDefinitionInput = {
  readonly card?: unknown
  readonly revlog?: unknown
  readonly time: unknown
}

type ChronoTimeNormalizerInputOf<
  Input extends ChronoTimeNormalizerDefinitionInput,
> = ChronoTimeNormalizerInput<
  Input['time'],
  Input extends { readonly card: infer Card } ? Card : never,
  Input extends { readonly revlog: infer Revlog } ? Revlog : never
>

export function defineChronoTimeNormalizer<
  Input extends ChronoTimeNormalizerDefinitionInput,
>(
  validate: (
    value: ChronoTimeNormalizerInputOf<Input>
  ) => StandardSchemaV1.Result<ChronoNormalizedTime<Input['time']>>
) {
  return defineSchema<
    ChronoTimeNormalizerInputOf<Input>,
    ChronoNormalizedTime<Input['time']>
  >(
    validate as (
      value: unknown
    ) => StandardSchemaV1.Result<ChronoNormalizedTime<Input['time']>>
  )
}

type ChronoTimeNormalizerInputFor<
  TimeSchema extends AnySchema,
  CardSchema extends AnyObjectSchema | undefined,
  RevlogSchema extends AnyObjectSchema | undefined,
> = ChronoTimeNormalizerInput<
  SchemaOutput<TimeSchema>,
  CardSchema extends AnyObjectSchema ? SchemaInput<CardSchema> : never,
  RevlogSchema extends AnyObjectSchema ? SchemaInput<RevlogSchema> : never
>

type ChronoTimeNormalizerDefinition<
  TimeSchema extends AnySchema,
  CardSchema extends AnyObjectSchema | undefined,
  RevlogSchema extends AnyObjectSchema | undefined,
> =
  | StandardSchemaV1<
      ChronoTimeNormalizerInputFor<TimeSchema, CardSchema, RevlogSchema>,
      ChronoNormalizedTime<SchemaOutput<TimeSchema>>
    >
  | ((
      value: ChronoTimeNormalizerInputFor<TimeSchema, CardSchema, RevlogSchema>
    ) => StandardSchemaV1.Result<
      ChronoNormalizedTime<SchemaOutput<TimeSchema>>
    >)

function resolveChronoTimeNormalizer(normalize: unknown) {
  if (typeof normalize === 'function') {
    return defineChronoTimeNormalizer(
      normalize as (
        value: ChronoTimeNormalizerInput<unknown>
      ) => StandardSchemaV1.Result<ChronoNormalizedTime<unknown>>
    )
  }

  return normalize
}

type ChronoDefinitionSchema = AnyChronoSchema

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
}

type ChronoDefinitionField<
  Schema extends ChronoDefinitionSchema,
  Key extends 'card' | 'revlog',
> = Schema extends { readonly [K in Key]: infer Field extends AnyObjectSchema }
  ? Field
  : undefined

type ChronoDefinition<Schema extends ChronoDefinitionSchema> = {
  readonly schema: Schema
  readonly defaultValue?: ChronoDefaultValue<ChronoDefinitionEnv<Schema>>
  readonly normalize: ChronoTimeNormalizerDefinition<
    Schema['time'],
    ChronoDefinitionField<Schema, 'card'>,
    ChronoDefinitionField<Schema, 'revlog'>
  >
  readonly create: ChronoCreate<ChronoDefinitionEnv<Schema>>
}

export function defineChrono<const Schema extends ChronoDefinitionSchema>(
  definition: ChronoDefinition<Schema>
): Chrono<ChronoDefinitionEnv<Schema>> {
  return {
    schema: {
      time: definition.schema.time,
      ...(definition.schema.config ? { config: definition.schema.config } : {}),
      ...(definition.schema.card ? { card: definition.schema.card } : {}),
      ...(definition.schema.revlog ? { revlog: definition.schema.revlog } : {}),
    },
    normalize: resolveChronoTimeNormalizer(definition.normalize),
    defaultValue: definition.defaultValue ?? {},
    create: definition.create,
  } as unknown as Chrono<ChronoDefinitionEnv<Schema>>
}
