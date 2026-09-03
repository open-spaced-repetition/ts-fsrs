function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') return `${value}n`
  if (value instanceof Error) {
    return {
      message: value.message,
      name: value.name,
      stack: value.stack,
    }
  }
  return value
}

export function formatConsoleValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'undefined') return 'undefined'
  if (typeof value === 'function')
    return `[Function ${value.name || 'anonymous'}]`
  if (typeof value === 'symbol') return value.toString()

  try {
    const json = JSON.stringify(value, jsonReplacer)
    if (json !== undefined) return json
  } catch {
    // Fall through for circular and host objects.
  }
  return String(value)
}

export function formatConsoleArguments(values: readonly unknown[]): string {
  return values.map(formatConsoleValue).join(' ')
}
