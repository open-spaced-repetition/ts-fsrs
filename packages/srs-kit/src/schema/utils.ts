/** biome-ignore-all lint/suspicious/noExplicitAny: wildcard constraint for generic bounds */
export type Prettify<T> = { [K in keyof T]: T[K] } & {}

export type EmptyObject = Record<PropertyKey, never>

export type MutableRecord = Record<PropertyKey, unknown>

/** @internal */
export type Unset = 'unset' & {
  __brand: 'srs-kit'
}

// ---------------------------------------------------------------------------
// Override / field-merge utilities
// ---------------------------------------------------------------------------

export type IsNonEmptyObject<T> = T extends object
  ? keyof T extends never
    ? false
    : true
  : false

export type Assign<TLeft, TRight> = TLeft extends any
  ? TRight extends any
    ? IsNonEmptyObject<TLeft> extends false
      ? TRight
      : IsNonEmptyObject<TRight> extends false
        ? TLeft
        : keyof TLeft & keyof TRight extends never
          ? TLeft & TRight
          : Omit<TLeft, keyof TRight> & TRight
    : never
  : never

export type IntersectAssign<TLeft, TRight> = TLeft extends any
  ? TRight extends any
    ? IsNonEmptyObject<TLeft> extends false
      ? TRight
      : IsNonEmptyObject<TRight> extends false
        ? TLeft
        : TRight & TLeft
    : never
  : never

export type Constrain<T, TConstraint, TDefault = TConstraint> =
  | (T extends TConstraint ? T : never)
  | TDefault

export type FirstChar<S extends string> = S extends `${infer C}${string}`
  ? C
  : never

export type NumericKeysWithPrefix<C extends string, T extends object> = {
  [K in string & keyof T]: T[K] extends number
    ? K extends `${C}${string}`
      ? K
      : never
    : never
}[string & keyof T]

export type BoundsPrefix<Key extends string, T extends object> =
  NumericKeysWithPrefix<FirstChar<Key>, T> extends Key ? FirstChar<Key> : string

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>
    }
  : T

export type UnionToIntersection<T> = (
  T extends any
    ? (arg: T) => any
    : never
) extends (arg: infer U) => any
  ? U
  : never

type ExtractObjects<TUnion> = TUnion extends
  | ReadonlyArray<any>
  | number
  | string
  | bigint
  | boolean
  | symbol
  | undefined
  | null
  ? never
  : TUnion

export type MergeAllObjects<
  TUnion,
  TIntersected = UnionToIntersection<ExtractObjects<TUnion>>,
> = [keyof TIntersected] extends [never]
  ? never
  : {
      [TKey in keyof TIntersected]: TUnion extends any
        ? TUnion[TKey & keyof TUnion]
        : never
    }

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
