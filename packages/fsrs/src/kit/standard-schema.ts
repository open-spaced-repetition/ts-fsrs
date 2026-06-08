import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { EmptyObject, SchemaInput, SchemaOutput } from './helper-types.js'

export type { StandardSchemaV1 } from '@standard-schema/spec'
export type {
  EmptyObject,
  Prettify,
  SchemaInput,
  SchemaOutput,
} from './helper-types.js'

export type StandardSchemaV1Contract<
  Input extends object = EmptyObject,
  Output extends object = Input,
> = StandardSchemaV1<Input, Output>

export type SchemaInputOrEmpty<Schema> = Schema extends StandardSchemaV1
  ? SchemaInput<Schema>
  : EmptyObject

export type SchemaOutputOrEmpty<Schema> = Schema extends StandardSchemaV1
  ? SchemaOutput<Schema>
  : EmptyObject

export type SchemaFragmentObject = Record<string, unknown>
