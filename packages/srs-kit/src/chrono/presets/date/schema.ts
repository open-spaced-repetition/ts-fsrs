import { dateSchema } from '@/schema/field.js'
import { defineSchema, isObject } from '@/schema/index.js'

export const MS_PER_DAY = 86_400_000

export type DateCardFields = {
  dueAt: Date
  lastReviewAt?: Date | null
}

export type DateRevlogFields = {
  dueAt: Date
  lastReviewAt: Date
}

function isValidDate(value: unknown): value is Date {
  return dateSchema.safeParse(value).success
}

function invalidDateFields() {
  return { issues: [{ message: 'Expected valid Date fields' }] }
}

export const dateCardFieldsSchema = defineSchema<
  DateCardFields,
  DateRevlogFields
>((value) => {
  if (!isObject(value) || !('dueAt' in value)) {
    return invalidDateFields()
  }

  const { dueAt, lastReviewAt } = value
  if (!isValidDate(dueAt)) {
    return invalidDateFields()
  }
  if (
    lastReviewAt !== undefined &&
    lastReviewAt !== null &&
    !isValidDate(lastReviewAt)
  ) {
    return invalidDateFields()
  }

  return {
    value: {
      dueAt,
      lastReviewAt: lastReviewAt ?? dueAt,
    },
  }
})

export const dateRevlogFieldsSchema = defineSchema<DateRevlogFields>(
  (value: unknown) => {
    if (!isObject(value) || !('dueAt' in value) || !('lastReviewAt' in value)) {
      return invalidDateFields()
    }

    const { dueAt, lastReviewAt } = value
    if (!isValidDate(dueAt) || !isValidDate(lastReviewAt)) {
      return invalidDateFields()
    }

    return { value: { dueAt, lastReviewAt } }
  }
)
