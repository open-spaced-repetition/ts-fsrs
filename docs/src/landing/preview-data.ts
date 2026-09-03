// Keep the scheduler out of this browser module.
import type { Grade } from 'ts-fsrs'

export type LandingPreviewRow = {
  readonly dueAt: string
  readonly stability: number
  readonly difficulty: number
  readonly scheduleStatus: string
  /** Fields added by custom middleware. */
  readonly extras: Readonly<Record<string, string | number | boolean>>
}

export type LandingPreview = {
  readonly now: string
  readonly grades: Readonly<Record<Grade, LandingPreviewRow>>
}

export type LandingPreviews = Readonly<Record<string, LandingPreview>>

export function intervalFrom(
  from: string,
  dueAt: string
): Partial<Record<Intl.DurationFormatUnit, number>> {
  const minutes = Math.round((Date.parse(dueAt) - Date.parse(from)) / 60_000)
  return {
    days: Math.floor(minutes / (60 * 24)),
    hours: Math.floor(minutes / 60) % 24,
    minutes: minutes % 60,
  }
}

type IntervalFormatter = (
  parts: Partial<Record<Intl.DurationFormatUnit, number>>
) => string

const UNITS = ['days', 'hours', 'minutes'] as const

// This runs in the browser, and `Intl.DurationFormat` is not Baseline widely
// available yet, so the units are worded and joined by hand where it is missing.
function buildFormatter(lang: string): IntervalFormatter {
  if (typeof Intl.DurationFormat === 'function') {
    const format = new Intl.DurationFormat(lang, { style: 'long' })
    return (parts) => format.format(parts)
  }

  const units = UNITS.map(
    (unit) =>
      [
        unit,
        new Intl.NumberFormat(lang, {
          style: 'unit',
          unit: unit.slice(0, -1),
          unitDisplay: 'long',
        }),
      ] as const
  )
  const list = new Intl.ListFormat(lang, { type: 'unit' })
  return (parts) => {
    const values: string[] = []
    for (const [unit, number] of units) {
      const value = parts[unit]
      if (value) values.push(number.format(value))
    }
    return list.format(values.length > 0 ? values : ['0'])
  }
}

// Intl formatter construction is expensive; the cache is bounded by site locales.
const intervalFormatters = new Map<string, IntervalFormatter>()

export function formatInterval(
  lang: string,
  from: string,
  dueAt: string
): string {
  let format = intervalFormatters.get(lang)
  if (!format) {
    format = buildFormatter(lang)
    intervalFormatters.set(lang, format)
  }
  return format(intervalFrom(from, dueAt))
}
