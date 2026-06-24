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

export interface SRSSchema<Input, Output = Input>
  extends StandardSchemaV1<Input, Output> {
  parse(input: unknown): Output
  safeParse(input: unknown): SafeParseResult<Output>
}

export function defineSchema<Output, Input = Output>(
  validate: (value: unknown) => StandardSchemaV1.Result<Output>
): SRSSchema<Input, Output> {
  return {
    '~standard': {
      version: 1,
      vendor: '@open-spaced-repetition/srs-kit',
      validate,
    },
    parse(input) {
      const result = validate(input)
      if (result.issues) {
        throw new SRSSchemaError(result.issues)
      }
      return result.value
    },
    safeParse(input) {
      const result = validate(input)
      if (result.issues) {
        return { success: false, issues: result.issues }
      }
      return { success: true, data: result.value }
    },
  }
}

export function parse<S extends AnySchema>(
  schema: S,
  input: unknown
): SchemaOutput<S> {
  const result = schema['~standard'].validate(input)
  if (result.issues) {
    throw new SRSSchemaError(result.issues)
  }
  return result.value
}

export class SRSSchemaError extends Error {
  readonly issues: ReadonlyArray<StandardSchemaV1.Issue>

  constructor(issues: ReadonlyArray<StandardSchemaV1.Issue>) {
    super()
    this.name = 'SRSSchemaError'
    this.issues = issues
  }
}
