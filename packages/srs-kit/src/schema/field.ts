import type { AnyObjectSchema, SchemaInput } from './standard.js'
import { isFiniteNumber, isObject } from './utils.js'
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
  isFiniteNumber(value)
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

export const desiredRetentionSchema = defineSchema<number>((value) =>
  isFiniteNumber(value) && value > 0 && value < 1
    ? { value }
    : { issues: [{ message: 'desiredRetention must be finite and in (0, 1)' }] }
)

export const elapsedDaysSchema = defineSchema<number>((value) =>
  isFiniteNumber(value) && value >= 0
    ? { value }
    : { issues: [{ message: 'elapsedDays must be finite and non-negative' }] }
)

export const scheduledDaysSchema = defineSchema<unknown, number>((value) =>
  isFiniteNumber(value) && value >= 0
    ? { value }
    : { issues: [{ message: 'scheduledDays must be finite and non-negative' }] }
)
