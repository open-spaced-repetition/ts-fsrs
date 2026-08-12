export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function roundTo(num: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(num * factor) / factor
}
