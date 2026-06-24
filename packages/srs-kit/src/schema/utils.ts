export type Prettify<T> = { [K in keyof T]: T[K] } & {}

export type EmptyObject = Record<PropertyKey, never>

export type MutableRecord = Record<PropertyKey, unknown>

/** @internal */
export type Unset = 'unset' & {
  __brand: 'srs-kit'
}

// biome-ignore lint/suspicious/noExplicitAny: wildcard constraint for generic bounds
type AnyFn = ((...args: any[]) => unknown) & Record<keyof any, unknown>

export function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && !Array.isArray(value) && typeof value === 'object'
}

export function isFunction(fn: unknown): fn is AnyFn {
  return typeof fn === 'function'
}

export const run = <TValue>(fn: () => TValue): TValue => fn()

export function noop(): void {}

export function assert(
  condition: boolean,
  msg = 'no additional info'
): asserts condition {
  if (!condition) {
    throw new Error(`AssertionError: ${msg}`)
  }
}
