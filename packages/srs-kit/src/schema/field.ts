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

export const numberSchema = defineSchema<unknown, number>((value) =>
  typeof value === 'number' && Number.isFinite(value)
    ? { value }
    : { issues: [{ message: 'Expected finite number' }] }
)

function isValidDate(value: unknown): value is Date {
  return (
    value instanceof Date &&
    value.getTime() !== 0 &&
    Number.isFinite(value.getTime())
  )
}

export const dateSchema = defineSchema<Date>((value) =>
  isValidDate(value)
    ? { value }
    : { issues: [{ message: 'Expected valid Date' }] }
)
