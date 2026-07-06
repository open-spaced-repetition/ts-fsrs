export type AttachedValue<Key extends symbol, Value> = {
  readonly [Property in Key]: Value
}

export function getAttachedValue<Key extends symbol, Value>(
  target: object,
  key: Key
): Value | undefined {
  return (target as Partial<AttachedValue<Key, Value>>)[key]
}

export function rememberAttachedValue<
  Target extends object,
  Key extends symbol,
  Value,
>(target: Target, key: Key, value: Value): Target & AttachedValue<Key, Value> {
  Object.defineProperty(target, key, {
    value,
    writable: false,
    enumerable: false,
    configurable: false,
  })
  return target as Target & AttachedValue<Key, Value>
}
