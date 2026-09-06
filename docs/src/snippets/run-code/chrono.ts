import { dateChrono, defineChrono } from 'ts-fsrs'

const millisecondsPerDay = 86_400_000

// Keep Date validation, card/revlog fields, and projection from the preset.
const fractionalDateChrono = defineChrono({
  schema: dateChrono.schema,
  projection: dateChrono.projection,
  defaultValue: dateChrono.defaultValue,
  create() {
    return {
      ...dateChrono.create(),
      difference: (from, to) =>
        (to.getTime() - from.getTime()) / millisecondsPerDay,
    }
  },
})

const from = new Date('2026-01-01T23:00:00.000Z')
const now = new Date('2026-01-02T01:00:00.000Z')
const clock = fractionalDateChrono.create()

console.log(
  JSON.stringify(
    {
      utcDateDifference: dateChrono.create().difference(from, now),
      fractionalDifference: clock.difference(from, now),
      halfDayLater: clock.add(from, 0.5).toISOString(),
    },
    null,
    2
  )
)
