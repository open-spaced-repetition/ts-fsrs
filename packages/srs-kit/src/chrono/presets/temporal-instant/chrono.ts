import { defineChrono } from '@/chrono/define-chrono.js'
import {
  getTemporalInstantConstructor,
  temporalInstantCardFieldsSchema,
  temporalInstantConfigSchema,
  temporalInstantRevlogFieldsSchema,
  temporalInstantSchema,
} from './schema.js'
import {
  addFixedUtcDays,
  UTC_TIMEZONE,
  utcDateDifferenceInDays,
} from './utc.js'

const NS_PER_MS = 1_000_000n

type DifferenceMode = 'fractional' | 'utc' | 'zoned'
type AddMode = 'utc' | 'zoned'

type DifferenceFn = (
  from: Temporal.Instant,
  to: Temporal.Instant,
  timezone: string
) => number

type AddFn = (
  from: Temporal.Instant,
  days: number,
  timezone: string
) => Temporal.Instant

const differenceByMode = {
  fractional: fractionalZonedDifferenceInDays,
  utc: utcDateDifferenceInDays,
  zoned: zonedDateDifferenceInDays,
} satisfies Record<DifferenceMode, DifferenceFn>

const addByMode = {
  utc: addFixedUtcDays,
  zoned: addZonedCalendarDays,
} satisfies Record<AddMode, AddFn>

export const temporalInstantChrono = defineChrono({
  schema: {
    config: temporalInstantConfigSchema,
    card: temporalInstantCardFieldsSchema,
    revlog: temporalInstantRevlogFieldsSchema,
    time: temporalInstantSchema,
  },
  projection(value) {
    if ('card' in value) {
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
          previous: card.value.lastReviewAt ?? time.value,
          current: time.value,
        },
      }
    }

    const revlog = temporalInstantRevlogFieldsSchema['~standard'].validate(
      value.revlog
    )
    if (revlog.issues) {
      return revlog
    }

    return {
      value: {
        previous: revlog.value.lastReviewAt,
        current: revlog.value.dueAt,
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
    getTemporalInstantConstructor()
    const { fractionalDays, timezone } = config
    const addMode = timezone === UTC_TIMEZONE ? 'utc' : 'zoned'
    const differenceMode = fractionalDays ? 'fractional' : addMode

    return {
      now,
      difference: (from, to) =>
        differenceByMode[differenceMode](from, to, timezone),
      add: (from, days) => addByMode[addMode](from, days, timezone),
    }
  },
})

const now = () => Temporal.Now.instant()

function zonedDateDifferenceInDays(
  from: Temporal.Instant,
  to: Temporal.Instant,
  timezone: string
): number {
  const fromDate = from.toZonedDateTimeISO(timezone).toPlainDate()
  const toDate = to.toZonedDateTimeISO(timezone).toPlainDate()

  return fromDate.until(toDate, { largestUnit: 'day' }).days
}

function fractionalZonedDifferenceInDays(
  from: Temporal.Instant,
  to: Temporal.Instant,
  timezone: string
): number {
  const fromZoned = from.toZonedDateTimeISO(timezone)
  const toZoned = to.toZonedDateTimeISO(timezone)

  return fromZoned
    .until(toZoned, { largestUnit: 'day', smallestUnit: 'nanosecond' })
    .total({ unit: 'day', relativeTo: fromZoned })
}

function addZonedCalendarDays(
  from: Temporal.Instant,
  days: number,
  timezone: string
): Temporal.Instant {
  const whole = Math.trunc(days)
  const fraction = days - whole
  const shifted = from.toZonedDateTimeISO(timezone).add({ days: whole })

  if (fraction === 0) {
    return shifted.toInstant()
  }

  const neighbor = shifted.add({ days: fraction > 0 ? 1 : -1 })
  const dayLengthMs = Math.abs(
    Number((neighbor.epochNanoseconds - shifted.epochNanoseconds) / NS_PER_MS)
  )
  const milliseconds =
    Math.round(Math.abs(fraction) * dayLengthMs) * Math.sign(fraction)

  return shifted.add({ milliseconds }).toInstant()
}
