import { defineSchema, isObject } from '@/schema/index.js'

export type TemporalInstantConfig = {
  readonly timezone: string
  readonly fractionalDays: boolean
}

export type TemporalInstantCardInputFields = {
  dueAt: Temporal.Instant
  lastReviewAt?: Temporal.Instant | null
}

export type TemporalInstantCardOutputFields = {
  dueAt: Temporal.Instant
  lastReviewAt: Temporal.Instant | null
}

export type TemporalInstantRevlogFields = {
  dueAt: Temporal.Instant
  lastReviewAt: Temporal.Instant
}

export function getTemporalInstantConstructor(): typeof Temporal.Instant {
  const temporal = globalThis.Temporal

  if (temporal?.Instant === undefined) {
    throw new ReferenceError(
      'Temporal.Instant is not available in this runtime. Install a Temporal polyfill or upgrade to Node.js 26+ for native Temporal support. See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal#browser_compatibility'
    )
  }

  return temporal.Instant
}

const UTC_OFFSET_RE = /^[+-](?:[01]\d|2[0-3]):[0-5]\d$/

function parseTimeZoneId(timezone: string): string | undefined {
  if (timezone === 'UTC' || UTC_OFFSET_RE.test(timezone)) {
    return timezone
  }

  try {
    return getTemporalInstantConstructor()
      .fromEpochNanoseconds(0n)
      .toZonedDateTimeISO(timezone).timeZoneId
  } catch {
    return undefined
  }
}

export const temporalInstantConfigSchema = defineSchema<
  Partial<TemporalInstantConfig>,
  TemporalInstantConfig
>((value) => {
  if (!isObject(value)) {
    return { issues: [{ message: 'Expected temporal instant config' }] }
  }

  const timezone = value.timezone === undefined ? 'UTC' : value.timezone
  if (typeof timezone !== 'string') {
    return { issues: [{ message: 'Expected timezone to be a string' }] }
  }
  const timezoneId = parseTimeZoneId(timezone)
  if (timezoneId === undefined) {
    return { issues: [{ message: 'Expected valid timezone' }] }
  }

  const fractionalDays =
    value.fractionalDays === undefined ? false : value.fractionalDays
  if (typeof fractionalDays !== 'boolean') {
    return { issues: [{ message: 'Expected fractionalDays to be a boolean' }] }
  }

  return { value: { timezone: timezoneId, fractionalDays } }
})

export const temporalInstantSchema = defineSchema<Temporal.Instant>((value) => {
  const TemporalInstant = getTemporalInstantConstructor()

  return value instanceof TemporalInstant
    ? { value }
    : { issues: [{ message: 'Expected Temporal.Instant' }] }
})

function invalidInstantFields() {
  return { issues: [{ message: 'Expected Temporal.Instant fields' }] }
}

export const temporalInstantCardFieldsSchema = defineSchema<
  TemporalInstantCardInputFields,
  TemporalInstantCardOutputFields
>((value) => {
  if (!isObject(value) || !('dueAt' in value)) {
    return invalidInstantFields()
  }

  const dueAt = temporalInstantSchema.safeParse(value.dueAt)
  if (!dueAt.success) {
    return invalidInstantFields()
  }

  if (value.lastReviewAt === undefined || value.lastReviewAt === null) {
    return {
      value: {
        dueAt: dueAt.data,
        lastReviewAt: null,
      },
    }
  }

  const lastReviewAt = temporalInstantSchema.safeParse(value.lastReviewAt)
  if (!lastReviewAt.success) {
    return invalidInstantFields()
  }

  return { value: { dueAt: dueAt.data, lastReviewAt: lastReviewAt.data } }
})

export const temporalInstantRevlogFieldsSchema =
  defineSchema<TemporalInstantRevlogFields>((value) => {
    if (!isObject(value) || !('dueAt' in value) || !('lastReviewAt' in value)) {
      return invalidInstantFields()
    }

    const dueAt = temporalInstantSchema.safeParse(value.dueAt)
    if (!dueAt.success) {
      return invalidInstantFields()
    }

    const lastReviewAt = temporalInstantSchema.safeParse(value.lastReviewAt)
    if (!lastReviewAt.success) {
      return invalidInstantFields()
    }

    return { value: { dueAt: dueAt.data, lastReviewAt: lastReviewAt.data } }
  })
