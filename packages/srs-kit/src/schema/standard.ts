import type { StandardSchemaV1 } from '@standard-schema/spec'

export type AnySchema = StandardSchemaV1<unknown, unknown>

export type AnyObjectSchema = StandardSchemaV1<unknown, object>

export type SchemaInput<S extends AnySchema> = StandardSchemaV1.InferInput<S>

export type SchemaOutput<S extends AnySchema> = StandardSchemaV1.InferOutput<S>

export type MaybePromise<T> = T | PromiseLike<T>

export class ModelSchemaError extends Error {
  readonly issues: ReadonlyArray<StandardSchemaV1.Issue>

  constructor(issues: ReadonlyArray<StandardSchemaV1.Issue>) {
    super(
      issues.length === 0
        ? 'Model schema validation failed'
        : issues.map((issue) => issue.message).join('; ')
    )
    this.name = 'ModelSchemaError'
    this.issues = issues
  }
}

export async function validateSchema<S extends AnySchema>(
  schema: S,
  input: unknown
): Promise<SchemaOutput<S>> {
  const result = await schema['~standard'].validate(input)

  if (result.issues) {
    throw new ModelSchemaError(result.issues)
  }

  return result.value
}
