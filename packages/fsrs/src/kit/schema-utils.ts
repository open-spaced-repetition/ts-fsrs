export function isObject(
  value: unknown
): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null
}

export function isNumberArray(value: unknown): value is number[] {
  if (!Array.isArray(value)) {
    return false
  }

  for (const item of value) {
    if (typeof item !== 'number' || !Number.isFinite(item)) {
      return false
    }
  }

  return true
}
