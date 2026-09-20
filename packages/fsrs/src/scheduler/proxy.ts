import {
  isFiniteNumber,
  isObject,
} from '@open-spaced-repetition/srs-kit/schema'

const FSRS7_STABILITY_FAST_MIN = 0.0001

type SchedulerMethod = (...args: unknown[]) => unknown

function migrateFSRS7MemoryState<T>(value: T): T {
  if (!isObject(value) || Object.hasOwn(value, 'stabilityFast')) return value

  const stability = value.stability
  if (!isFiniteNumber(stability)) {
    return value
  }

  return {
    ...value,
    stabilityFast:
      stability === 0 ? 0 : Math.max(stability * 0.8, FSRS7_STABILITY_FAST_MIN),
  } as T
}

function migrateFSRS7Field<T>(value: T, field: string): T {
  if (!isObject(value)) return value
  const state = value[field]
  const migrated = migrateFSRS7MemoryState(state)
  return migrated === state ? value : ({ ...value, [field]: migrated } as T)
}

export function createFSRS7MigrationProxy<T extends object>(scheduler: T): T {
  const wrappedMethods = new Map<PropertyKey, unknown>()

  return new Proxy(scheduler, {
    get(target, property, receiver) {
      const method = Reflect.get(target, property, receiver)
      if (typeof method !== 'function') return method

      const cached = wrappedMethods.get(property)
      if (cached) return cached

      const call = (args: unknown[]) =>
        Reflect.apply(method as SchedulerMethod, target, args)
      let wrapped: unknown

      if (
        property === 'review' ||
        property === 'preview' ||
        property === 'forget'
      ) {
        wrapped = (input: unknown) => call([migrateFSRS7Field(input, 'card')])
      } else if (property === 'forward') {
        wrapped = (input: unknown) =>
          call([migrateFSRS7Field(input, 'initialCard')])
      } else if (property === 'rollback') {
        wrapped = (input: unknown) =>
          call([migrateFSRS7Field(migrateFSRS7Field(input, 'card'), 'revlog')])
      } else if (property === 'nextInterval') {
        wrapped = (state: unknown, retention: unknown, context: unknown) =>
          call([
            migrateFSRS7MemoryState(state),
            retention,
            migrateFSRS7Field(context, 'card'),
          ])
      } else {
        return method
      }

      wrappedMethods.set(property, wrapped)
      return wrapped
    },
  })
}
