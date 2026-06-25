import { defineChrono } from '@/chrono/define-chrono.js'
import { parse } from '@/schema/index.js'
import {
  temporalZonedDateTimeCardFieldsSchema,
  temporalZonedDateTimeConfigSchema,
  temporalZonedDateTimeRevlogFieldsSchema,
  temporalZonedDateTimeSchema,
} from './schema.js'

export const temporalZonedDateTimeChrono = defineChrono({
  schema: {
    config: temporalZonedDateTimeConfigSchema,
    card: temporalZonedDateTimeCardFieldsSchema,
    revlog: temporalZonedDateTimeRevlogFieldsSchema,
    time: temporalZonedDateTimeSchema,
  },
  projection(value) {
    const card = temporalZonedDateTimeCardFieldsSchema['~standard'].validate(
      value.card
    )
    if (card.issues) {
      return card
    }

    const time = temporalZonedDateTimeSchema['~standard'].validate(value.time)
    if (time.issues) {
      return time
    }

    return {
      value: {
        previous: value.card.lastReviewAt ?? time.value,
        current: time.value,
      },
    }
  },
  defaultValue: {
    card({ previous, time }) {
      return {
        dueAt: time,
        lastReviewAt: previous?.current ?? null,
      }
    },
    revlog({ time, previous }) {
      return {
        dueAt: previous?.current ?? time,
        lastReviewAt: previous?.previous ?? time,
      }
    },
  },
  create({ config }) {
    const { fractionalDays, timezone } = parse(
      temporalZonedDateTimeConfigSchema,
      config
    )

    const difference = (
      from: Temporal.ZonedDateTime,
      to: Temporal.ZonedDateTime
    ): number =>
      fractionalDays
        ? fractionalDifferenceInDays(from, to, timezone)
        : differenceInDays(from, to, timezone)

    const add = (
      from: Temporal.ZonedDateTime,
      days: number
    ): Temporal.ZonedDateTime => addDays(from, days, timezone)

    return {
      difference,
      add,
    }
  },
})

function differenceInDays(
  from: Temporal.ZonedDateTime,
  to: Temporal.ZonedDateTime,
  timezone: string
): number {
  const fromZoned = from.withTimeZone(timezone)
  const toZoned = to.withTimeZone(timezone)

  return fromZoned
    .toPlainDate()
    .until(toZoned.toPlainDate(), { largestUnit: 'day' }).days
}

function fractionalDifferenceInDays(
  from: Temporal.ZonedDateTime,
  to: Temporal.ZonedDateTime,
  timezone: string
): number {
  const fromZoned = from.withTimeZone(timezone)
  const toZoned = to.withTimeZone(timezone)

  return fromZoned
    .until(toZoned, { largestUnit: 'day' })
    .total({ unit: 'day', relativeTo: fromZoned })
}

function addDays(
  from: Temporal.ZonedDateTime,
  days: number,
  timezone: string
): Temporal.ZonedDateTime {
  const wholeDays = Math.trunc(days)
  const fractionalDays = days - wholeDays
  const zoned = from.withTimeZone(timezone).add({ days: wholeDays })

  if (fractionalDays === 0) {
    return zoned
  }

  const direction = fractionalDays > 0 ? 1 : -1
  const neighbor = zoned.add({ days: direction })
  const dayLength = Number(
    (neighbor.epochNanoseconds - zoned.epochNanoseconds) * BigInt(direction)
  )
  const nanoseconds = Math.round(fractionalDays * dayLength)

  return zoned.add({ nanoseconds })
}
