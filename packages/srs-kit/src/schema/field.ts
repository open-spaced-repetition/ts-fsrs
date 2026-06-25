import type { AnyObjectSchema, SchemaInput } from './standard.js'
import { isObject } from './utils.js'
import { defineSchema } from './validators.js'

export type FieldDefault<Schema extends AnyObjectSchema, DefaultContext> = (
  ctx: DefaultContext
) => SchemaInput<Schema>

export const emptyObjectSchema = defineSchema<Record<string, never>>(
  (value) => {
    if (!isObject(value) || Object.keys(value).length > 0) {
      return { issues: [{ message: 'Expected empty object' }] }
    }

    return { value: {} }
  }
)
