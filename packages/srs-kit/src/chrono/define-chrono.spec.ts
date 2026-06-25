import { describe, expect, expectTypeOf, it } from 'vitest'
import { defineSchema, emptyObjectSchema } from '../schema/index.js'
import {
  type ChronoCardOf,
  type ChronoRevlogOf,
  type ChronoTimeOf,
  defineChrono,
} from './index.js'

describe('defineChrono', () => {
  it('fills omitted schema slots and default values', () => {
    const chrono = defineChrono({
      schema: {
        time: numberSchema,
      },
      projection() {
        return { value: { previous: null, current: 0 } }
      },
      create() {
        return {
          difference(from, to) {
            return from === null ? 0 : to - from
          },
          add(from, days) {
            return from + days
          },
        }
      },
    })

    const instance = chrono.create()
    expect(chrono.schema.config).toBe(emptyObjectSchema)
    expect(chrono.schema.card).toBe(emptyObjectSchema)
    expect(chrono.schema.revlog).toBe(emptyObjectSchema)
    expect(chrono.defaultValue).toEqual({})
    expect(instance.difference(null, 3)).toBe(0)
  })

  it('preserves schema and context inference', () => {
    const chrono = defineChrono({
      schema: {
        config: emptyObjectSchema,
        card: numberProjectionSchema,
        revlog: revlogSchema,
        time: numberSchema,
      },
      projection(value) {
        expectTypeOf(value).toEqualTypeOf<{
          readonly previous: number | null
          readonly current: number
        }>()

        return { value }
      },
      defaultValue: {
        card({ config, previous, time }) {
          expectTypeOf(config).toEqualTypeOf<Readonly<Record<string, never>>>()
          expectTypeOf(previous).toEqualTypeOf<
            | Readonly<{
                readonly previous: number | null
                readonly current: number
              }>
            | undefined
          >()
          expectTypeOf(time).toEqualTypeOf<number>()

          return {
            previous: previous?.current ?? null,
            current: time,
          }
        },
        revlog({ previous, time }) {
          return {
            elapsedDays: previous ? time - previous.current : 0,
          }
        },
      },
      create() {
        return {
          difference(from, to) {
            return from === null ? 0 : to - from
          },
          add(from, days) {
            return from + days
          },
        }
      },
    })

    expectTypeOf<ChronoTimeOf<typeof chrono>>().toEqualTypeOf<number>()
    expectTypeOf<ChronoCardOf<typeof chrono>>().toEqualTypeOf<{
      readonly previous: number | null
      readonly current: number
    }>()
    expectTypeOf<ChronoRevlogOf<typeof chrono>>().toEqualTypeOf<{
      readonly elapsedDays: number
    }>()
    expectTypeOf(chrono.schema).toEqualTypeOf<{
      readonly config: typeof emptyObjectSchema
      readonly time: typeof numberSchema
      readonly card: typeof numberProjectionSchema
      readonly revlog: typeof revlogSchema
    }>()
  })

  it('accepts a projection schema directly', () => {
    const chrono = defineChrono({
      schema: {
        card: numberProjectionSchema,
        time: numberSchema,
      },
      projection: numberProjectionSchema,
      create() {
        return {
          difference(from, to) {
            return from === null ? 0 : to - from
          },
          add(from, days) {
            return from + days
          },
        }
      },
    })

    expect(chrono.projection).toBe(numberProjectionSchema)
  })
})

const numberSchema = defineSchema<number>((value) =>
  typeof value === 'number' && Number.isFinite(value)
    ? { value }
    : { issues: [{ message: 'Expected finite number' }] }
)

const numberProjectionSchema = defineSchema<{
  readonly previous: number | null
  readonly current: number
}>((value) => {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('previous' in value) ||
    !('current' in value)
  ) {
    return { issues: [{ message: 'Expected number projection fields' }] }
  }

  const { previous, current } = value
  if (
    previous !== null &&
    (typeof previous !== 'number' || !Number.isFinite(previous))
  ) {
    return { issues: [{ message: 'Expected valid previous' }] }
  }
  if (typeof current !== 'number' || !Number.isFinite(current)) {
    return { issues: [{ message: 'Expected valid current' }] }
  }

  return { value: { previous, current } }
})

const revlogSchema = defineSchema<{ readonly elapsedDays: number }>((value) => {
  if (
    typeof value === 'object' &&
    value !== null &&
    'elapsedDays' in value &&
    typeof value.elapsedDays === 'number' &&
    Number.isFinite(value.elapsedDays)
  ) {
    return { value: { elapsedDays: value.elapsedDays } }
  }

  return { issues: [{ message: 'Expected revlog fields' }] }
})
