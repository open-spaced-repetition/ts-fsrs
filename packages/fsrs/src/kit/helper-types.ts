import type { StandardSchemaV1 } from '@standard-schema/spec'

// Forces TS to expand a type into its resolved object shape (better hover/errors).
export type Prettify<T> = { [K in keyof T]: T[K] } & {}

export type SchemaInput<S extends StandardSchemaV1> =
  StandardSchemaV1.InferInput<S>
export type SchemaOutput<S extends StandardSchemaV1> =
  StandardSchemaV1.InferOutput<S>
