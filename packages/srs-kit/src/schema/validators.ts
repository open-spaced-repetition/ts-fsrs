import type { StandardSchemaV1 } from '@vendor/standard-schema.js'
import type { AnySchema, SchemaOutput, SRSSchema } from './standard.js'

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
