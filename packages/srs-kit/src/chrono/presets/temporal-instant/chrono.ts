import { defineChrono } from '@/chrono/define-chrono.js'
import { parse } from '@/schema/index.js'
import {
  getTemporalInstantConstructor,
  temporalInstantCardFieldsSchema,
  temporalInstantConfigSchema,
  temporalInstantRevlogFieldsSchema,
  temporalInstantSchema,
} from './schema.js'

export const temporalInstantChrono = defineChrono({
  schema: {
    config: temporalInstantConfigSchema,
    card: temporalInstantCardFieldsSchema,
    revlog: temporalInstantRevlogFieldsSchema,
    time: temporalInstantSchema,
  },
  projection(value) {
    const card = temporalInstantCardFieldsSchema['~standard'].validate(
      value.card
    )
    if (card.issues) {
      return card
    }

    const time = temporalInstantSchema['~standard'].validate(value.time)
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
    const TemporalInstant = getTemporalInstantConstructor()
    const { fractionalDays, timezone } = parse(
      temporalInstantConfigSchema,
      config
    )

    const difference = (
      from: Temporal.Instant,
      to: Temporal.Instant
    ): number =>
      fractionalDays
        ? fractionalDifferenceInDays(from, to, timezone)
        : differenceInDays(from, to, timezone)

    const add = (from: Temporal.Instant, days: number): Temporal.Instant =>
      addDays(from, days, timezone, TemporalInstant)

    return {
      difference,
      add,
    }
  },
})

function differenceInDays(
  from: Temporal.Instant,
  to: Temporal.Instant,
  timezone: string
): number {
  const fromDate = from.toZonedDateTimeISO(timezone).toPlainDate()
  const toDate = to.toZonedDateTimeISO(timezone).toPlainDate()

  return fromDate.until(toDate, { largestUnit: 'day' }).days
}

function fractionalDifferenceInDays(
  from: Temporal.Instant,
  to: Temporal.Instant,
  timezone: string
): number {
  const fromZoned = from.toZonedDateTimeISO(timezone)
  const toZoned = to.toZonedDateTimeISO(timezone)

  return fromZoned
    .until(toZoned, { largestUnit: 'day' })
    .total({ unit: 'day', relativeTo: fromZoned })
}

function addDays(
  from: Temporal.Instant,
  days: number,
  timezone: string,
  TemporalInstant: typeof Temporal.Instant
): Temporal.Instant {
  const wholeDays = Math.trunc(days)
  const fractionalDays = days - wholeDays
  const zoned = from.toZonedDateTimeISO(timezone).add({ days: wholeDays })

  if (fractionalDays === 0) {
    return zoned.toInstant()
  }

  const direction = fractionalDays > 0 ? 1 : -1
  const neighbor = zoned.add({ days: direction })
  const dayLength = Number(
    (neighbor.epochNanoseconds - zoned.epochNanoseconds) * BigInt(direction)
  )
  const offset = BigInt(Math.round(Math.abs(fractionalDays) * dayLength))

  return TemporalInstant.fromEpochNanoseconds(
    zoned.epochNanoseconds + BigInt(direction) * offset
  )
}
