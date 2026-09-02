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

// Intl formatter construction is expensive; the cache is bounded by site locales.
const intervalFormats = new Map<string, Intl.DurationFormat>()

export function formatInterval(
  lang: string,
  from: string,
  dueAt: string
): string {
  if (typeof Intl.DurationFormat !== 'function') {
    const parts = intervalFrom(from, dueAt)
    const values = (['days', 'hours', 'minutes'] as const)
      .filter((unit) => parts[unit])
      .map((unit) =>
        new Intl.NumberFormat(lang, {
          style: 'unit',
          unit: unit.slice(0, -1),
          unitDisplay: 'long',
        }).format(parts[unit] ?? 0)
      )
    return new Intl.ListFormat(lang, { type: 'unit' }).format(
      values.length > 0 ? values : ['0']
    )
  }

  let format = intervalFormats.get(lang)
  if (!format) {
    format = new Intl.DurationFormat(lang, { style: 'long' })
    intervalFormats.set(lang, format)
  }
  return format.format(intervalFrom(from, dueAt))
}
