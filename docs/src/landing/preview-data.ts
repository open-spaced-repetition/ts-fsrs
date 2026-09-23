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

// Intl formatter construction is expensive; the cache is bounded by locales and units.
const intervalFormatters = new Map<string, Intl.NumberFormat>()

export function formatInterval(
  lang: string,
  from: string,
  dueAt: string
): string {
  const minutes = (Date.parse(dueAt) - Date.parse(from)) / 60_000
  const unit = minutes >= 1440 ? 'day' : minutes >= 60 ? 'hour' : 'minute'
  const value =
    unit === 'day' ? minutes / 1440 : unit === 'hour' ? minutes / 60 : minutes
  const key = `${lang}:${unit}`
  let format = intervalFormatters.get(key)
  if (!format) {
    format = new Intl.NumberFormat(lang, {
      style: 'unit',
      unit,
      unitDisplay: 'long',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      trailingZeroDisplay: 'stripIfInteger',
    })
    intervalFormatters.set(key, format)
  }
  return format.format(value)
}
