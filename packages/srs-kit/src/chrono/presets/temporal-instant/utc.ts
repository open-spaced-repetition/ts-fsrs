export const UTC_TIMEZONE = 'UTC'

const MS_PER_DAY = 86_400_000

export function utcDateDifferenceInDays(
  from: Temporal.Instant,
  to: Temporal.Instant
): number {
  const fromDate = from.toZonedDateTimeISO(UTC_TIMEZONE).toPlainDate()
  const toDate = to.toZonedDateTimeISO(UTC_TIMEZONE).toPlainDate()

  return fromDate.until(toDate, { largestUnit: 'day' }).days
}

export function addFixedUtcDays(
  from: Temporal.Instant,
  days: number
): Temporal.Instant {
  return from.add({ milliseconds: Math.round(days * MS_PER_DAY) })
}
