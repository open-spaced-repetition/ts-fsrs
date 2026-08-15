import type { StandardSchemaV1 } from '@vendor/standard-schema.js'
import type { AnySchema, SchemaOutput } from './standard.js'

function isPromiseLike(value: object): value is PromiseLike<unknown> {
  return 'then' in value && typeof value.then === 'function'
}

export function validateSync<Schema extends AnySchema>(
  schema: Schema,
  input: unknown
): StandardSchemaV1.Result<SchemaOutput<Schema>> {
  const result = schema['~standard'].validate(input)
  if (isPromiseLike(result)) {
    throw new TypeError('Async Standard Schema validation is not supported')
  }
  return result
}
