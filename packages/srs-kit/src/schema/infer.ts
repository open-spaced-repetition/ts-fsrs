import type { AnySchema, SchemaInput, SchemaOutput } from './standard.js'

export interface HasSchema<Key extends PropertyKey> {
  readonly schema: {
    readonly [K in Key]: AnySchema
  }
}

export type SchemaOf<T, Key extends PropertyKey> =
  T extends HasSchema<Key> ? T['schema'][Key] : never

export type SchemaOutputOf<T, Key extends PropertyKey> = SchemaOutput<
  SchemaOf<T, Key>
>

export type SchemaInputOf<T, Key extends PropertyKey> = SchemaInput<
  SchemaOf<T, Key>
>
