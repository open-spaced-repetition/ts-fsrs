export function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min
  }
  if (value > max) {
    return max
  }
  return value
}

export function createRange(length: number): number[] {
  return Array.from({ length }, (_, index) => index)
}

export function sum(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0)
}

export async function yieldToEventLoop(): Promise<void> {
  await new Promise<void>((resolve) => {
    setImmediate(resolve)
  })
}

export function invariant(
  condition: unknown,
  message: string
): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}
