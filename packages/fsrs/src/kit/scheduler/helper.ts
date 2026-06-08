import type { StandardSchemaV1 } from '@standard-schema/spec'
import { FSRSValidationError } from '../../error.js'
import type { SchemaFragmentObject } from '../standard-schema.js'

export function parseFragments(
  sources: readonly StandardSchemaV1[],
  input: object
): readonly SchemaFragmentObject[] {
  const fragments: SchemaFragmentObject[] = []
  const issues: StandardSchemaV1.Issue[] = []

  for (const source of sources) {
    const result = source['~standard'].validate(input)

    if (result instanceof Promise) {
      throw new FSRSValidationError(`async schema is not supported`)
    }

    if (result.issues) {
      issues.push(...result.issues)
      continue
    }

    if (!isFragmentObject(result.value)) {
      issues.push({
        message: `schema output must be an object`,
      })
      continue
    }

    fragments.push(result.value)
  }

  if (issues.length > 0) {
    throw new FSRSValidationError(`invalid : ${JSON.stringify(issues)}`)
  }

  return fragments
}

function isFragmentObject(value: unknown): value is SchemaFragmentObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
