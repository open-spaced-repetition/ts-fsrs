import { dateChrono } from 'ts-fsrs'

const clock = dateChrono.create()
const from = new Date('2026-01-01T23:00:00.000Z')
const to = new Date('2026-01-02T01:00:00.000Z')

console.log(
  JSON.stringify({
    elapsedDays: clock.difference(from, to),
    halfDayLater: clock.add(from, 0.5).toISOString(),
    order: clock.compare?.(from, to),
  })
)
