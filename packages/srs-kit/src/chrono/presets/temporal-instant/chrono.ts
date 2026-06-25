import { defineChrono } from '@/chrono/define-chrono.js'
import {
  getTemporalInstantConstructor,
  temporalInstantCardFieldsSchema,
  temporalInstantConfigSchema,
  temporalInstantRevlogFieldsSchema,
  temporalInstantSchema,
} from './schema.js'

const UTC_TIMEZONE = 'UTC'
const MS_PER_DAY = 86_400_000
const NS_PER_MS = 1_000_000n
const NS_PER_DAY = 86_400_000_000_000n

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
  const { whole, fraction } = splitDays(days)
  const zdt = from.toZonedDateTimeISO(timezone)
  const afterDays = zdt.add({ days: whole })

  if (fraction === 0) {
    return afterDays.toInstant()
  }

  const milliseconds = fractionToMilliseconds(
    fraction,
    zonedDayLengthInMilliseconds(afterDays, fraction)
  )

  return afterDays.add({ milliseconds }).toInstant()
}

function utcDateDifferenceInDays(
  from: Temporal.Instant,
  to: Temporal.Instant
): number {
  return Number(utcDayIndex(to) - utcDayIndex(from))
}

function utcDayIndex(value: Temporal.Instant): bigint {
  const epochNanoseconds = value.epochNanoseconds
  const quotient = epochNanoseconds / NS_PER_DAY
  const remainder = epochNanoseconds % NS_PER_DAY

  return remainder < 0n ? quotient - 1n : quotient
}

function addFixedUtcDays(
  from: Temporal.Instant,
  days: number
): Temporal.Instant {
  const { whole, fraction } = splitDays(days)
  const milliseconds = fractionToMilliseconds(fraction, MS_PER_DAY)
  const nanoseconds =
    BigInt(whole) * NS_PER_DAY + BigInt(milliseconds) * NS_PER_MS

  return Temporal.Instant.fromEpochNanoseconds(
    from.epochNanoseconds + nanoseconds
  )
}

function splitDays(days: number): {
  readonly whole: number
  readonly fraction: number
} {
  const whole = Math.trunc(days)

  return { whole, fraction: days - whole }
}

function fractionToMilliseconds(fraction: number, dayLengthMs: number): number {
  return Math.round(Math.abs(fraction) * dayLengthMs) * Math.sign(fraction)
}

function zonedDayLengthInMilliseconds(
  from: Temporal.ZonedDateTime,
  fraction: number
): number {
  const direction = fraction > 0 ? 1 : -1
  const neighbor = from.add({ days: direction })

  return Number(
    ((neighbor.epochNanoseconds - from.epochNanoseconds) * BigInt(direction)) /
      NS_PER_MS
  )
}
