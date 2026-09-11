import 'temporal-polyfill/global'
import 'temporal-polyfill/types/global'
import { temporalInstantChrono } from 'ts-fsrs'

const clock = temporalInstantChrono.create({
  config: { timezone: 'America/New_York', fractionalDays: false },
})
const fractionalClock = temporalInstantChrono.create({
  config: { timezone: 'America/New_York', fractionalDays: true },
})

// Noon in New York, the day before daylight saving time starts.
const from = Temporal.Instant.from('2026-03-07T17:00:00Z')
const next = clock.add(from, 1)
const halfDay = clock.add(from, 0.5)

console.log(
  JSON.stringify(
    {
      nextDayUTC: next.toString(),
      elapsedHours: from.until(next).total('hours'),
      calendarDays: clock.difference(from, next),
      fractionalDays: fractionalClock.difference(from, halfDay),
    },
    null,
    2
  )
)
