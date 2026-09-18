import { dateChrono, defineChrono } from 'ts-fsrs'

const millisecondsPerDay = 86_400_000

// Keep Date validation, card/revlog fields, and time normalization from the preset.
const fractionalDateChrono = defineChrono({
  schema: dateChrono.schema,
  normalize: dateChrono.normalize,
  defaultValue: dateChrono.defaultValue,
  create(ctx) {
    return {
      ...dateChrono.create(ctx),
      difference: (from, to) =>
        (to.getTime() - from.getTime()) / millisecondsPerDay,
    }
  },
})

const from = new Date('2026-01-01T23:00:00.000Z')
const now = new Date('2026-01-02T01:00:00.000Z')
const clock = fractionalDateChrono.create({ config: { fractionalDays: false } })

console.log(
  JSON.stringify(
    {
      utcDateDifference: dateChrono
        .create({ config: { fractionalDays: false } })
        .difference(from, now),
      fractionalDifference: clock.difference(from, now),
      halfDayLater: clock.add(from, 0.5).toISOString(),
    },
    null,
    2
  )
)
