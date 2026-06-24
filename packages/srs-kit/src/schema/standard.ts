import type { StandardSchemaV1 } from '@vendor/standard-schema.js'

// biome-ignore lint/suspicious/noExplicitAny: wildcard constraint for generic bounds
export type AnySchema = StandardSchemaV1<any, any>

// biome-ignore lint/suspicious/noExplicitAny: wildcard constraint for generic bounds
export type AnyObjectSchema = StandardSchemaV1<any, object>

export type SchemaInput<S extends AnySchema> = StandardSchemaV1.InferInput<S>

export type SchemaOutput<S extends AnySchema> = StandardSchemaV1.InferOutput<S>

export type SafeParseSuccess<T> = {
  readonly success: true
  readonly data: T
}

export type SafeParseFailure = {
  readonly success: false
  readonly issues: ReadonlyArray<StandardSchemaV1.Issue>
}

export type SafeParseResult<T> = SafeParseSuccess<T> | SafeParseFailure

export type SRSSchemaTypes<Input = unknown, Output = Input> = {
  input: Input
  output: Output
}

export interface SRSSchema<Definition extends SRSSchemaTypes>
  extends StandardSchemaV1<Definition['input'], Definition['output']> {
  parse(input: unknown): Definition['output']
  safeParse(input: unknown): SafeParseResult<Definition['output']>
}
