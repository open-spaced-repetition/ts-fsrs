import type {} from './env.js'

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function roundTo(num: number, decimals: number): number {
  if (import.meta.env?.TS_FSRS_DISABLE_ROUNDING === true) {
    return num
  }

  const factor = 10 ** decimals
  return Math.round(num * factor) / factor
}
