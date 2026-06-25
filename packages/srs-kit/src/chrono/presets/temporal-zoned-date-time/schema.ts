import { defineSchema, isObject } from '@/schema/index.js'

export type TemporalZonedDateTimeConfig = {
  readonly timezone: string
  readonly fractionalDays: boolean
}

export type TemporalZonedDateTimeCardFields = {
  dueAt: Temporal.ZonedDateTime
  lastReviewAt?: Temporal.ZonedDateTime | null
}

export type TemporalZonedDateTimeRevlogFields = {
  dueAt: Temporal.ZonedDateTime
  lastReviewAt: Temporal.ZonedDateTime
}

export function getTemporalZonedDateTimeConstructor(): typeof Temporal.ZonedDateTime {
  const temporal = globalThis.Temporal

  if (temporal?.ZonedDateTime === undefined) {
    throw new ReferenceError(
      'Temporal.ZonedDateTime is not available in this runtime. Install a Temporal polyfill or use a non-Temporal time adapter.'
    )
  }

  return temporal.ZonedDateTime
}

export const temporalZonedDateTimeConfigSchema = defineSchema<
  Partial<TemporalZonedDateTimeConfig>,
  TemporalZonedDateTimeConfig
>((value) => {
  if (!isObject(value)) {
    return { issues: [{ message: 'Expected temporal zoned date-time config' }] }
  }

  const timezone = value.timezone === undefined ? 'UTC' : value.timezone
  if (typeof timezone !== 'string') {
    return { issues: [{ message: 'Expected timezone to be a string' }] }
  }

  const fractionalDays =
    value.fractionalDays === undefined ? false : value.fractionalDays
  if (typeof fractionalDays !== 'boolean') {
    return { issues: [{ message: 'Expected fractionalDays to be a boolean' }] }
  }

  return { value: { timezone, fractionalDays } }
})

export const temporalZonedDateTimeSchema = defineSchema<Temporal.ZonedDateTime>(
  (value) => {
    const TemporalZonedDateTime = getTemporalZonedDateTimeConstructor()

    return value instanceof TemporalZonedDateTime
      ? { value }
      : { issues: [{ message: 'Expected Temporal.ZonedDateTime' }] }
  }
)

function invalidZonedDateTimeFields() {
  return { issues: [{ message: 'Expected Temporal.ZonedDateTime fields' }] }
}

export const temporalZonedDateTimeCardFieldsSchema = defineSchema<
  TemporalZonedDateTimeCardFields,
  TemporalZonedDateTimeRevlogFields
>((value) => {
  if (!isObject(value) || !('dueAt' in value)) {
    return invalidZonedDateTimeFields()
  }

  const dueAt = temporalZonedDateTimeSchema.safeParse(value.dueAt)
  if (!dueAt.success) {
    return invalidZonedDateTimeFields()
  }

  if (value.lastReviewAt === undefined || value.lastReviewAt === null) {
    return { value: { dueAt: dueAt.data, lastReviewAt: dueAt.data } }
  }

  const lastReviewAt = temporalZonedDateTimeSchema.safeParse(value.lastReviewAt)
  if (!lastReviewAt.success) {
    return invalidZonedDateTimeFields()
  }

  return { value: { dueAt: dueAt.data, lastReviewAt: lastReviewAt.data } }
})

export const temporalZonedDateTimeRevlogFieldsSchema =
  defineSchema<TemporalZonedDateTimeRevlogFields>((value) => {
    if (!isObject(value) || !('dueAt' in value) || !('lastReviewAt' in value)) {
      return invalidZonedDateTimeFields()
    }

    const dueAt = temporalZonedDateTimeSchema.safeParse(value.dueAt)
    if (!dueAt.success) {
      return invalidZonedDateTimeFields()
    }

    const lastReviewAt = temporalZonedDateTimeSchema.safeParse(
      value.lastReviewAt
    )
    if (!lastReviewAt.success) {
      return invalidZonedDateTimeFields()
    }

    return { value: { dueAt: dueAt.data, lastReviewAt: lastReviewAt.data } }
  })
