import { describe, expect, expectTypeOf, it } from 'vitest'
import { defineSchema, type FieldDefault } from './index.js'
import type { SchemaInputOf, SchemaOutputOf } from './infer.js'
import { isObject } from './utils.js'

const configSchema = defineSchema<{ enabled: boolean }>((value) => {
  if (!isObject(value)) {
    return { issues: [{ message: 'Expected object' }] }
  }
  if (typeof value.enabled !== 'boolean') {
    return { issues: [{ message: 'Expected boolean' }] }
  }
  return { value: { enabled: value.enabled } }
})

const inputSchema = defineSchema<string, number>((value) => {
  if (typeof value !== 'string') {
    return { issues: [{ message: 'Expected string' }] }
  }
  return { value: Number(value) }
})

const cardSchema = defineSchema<{ dueAt: Date }>((value) => {
  if (!isObject(value)) {
    return { issues: [{ message: 'Expected object' }] }
  }
  const dueAt = value.dueAt
  if (!(dueAt instanceof Date) || !Number.isFinite(dueAt.getTime())) {
    return { issues: [{ message: 'Expected Date' }] }
  }
  return { value: { dueAt } }
})

const revlogSchema = defineSchema<{ elapsedDays: number }>((value) => {
  if (!isObject(value)) {
    return { issues: [{ message: 'Expected object' }] }
  }
  const elapsedDays = value.elapsedDays
  if (typeof elapsedDays !== 'number' || !Number.isFinite(elapsedDays)) {
    return { issues: [{ message: 'Expected number' }] }
  }
  return { value: { elapsedDays } }
})

const definition = {
  schema: {
    config: configSchema,
    input: inputSchema,
    card: cardSchema,
    revlog: revlogSchema,
  },
}

describe('schema infer helpers', () => {
  it('extracts direct schema slots and object field contribution schemas', () => {
    expectTypeOf<SchemaOutputOf<typeof definition, 'config'>>().toEqualTypeOf<{
      enabled: boolean
    }>()
    expectTypeOf<
      SchemaInputOf<typeof definition, 'input'>
    >().toEqualTypeOf<string>()
    expectTypeOf<SchemaOutputOf<typeof definition, 'card'>>().toEqualTypeOf<{
      dueAt: Date
    }>()
    expectTypeOf<SchemaOutputOf<typeof definition, 'revlog'>>().toEqualTypeOf<{
      elapsedDays: number
    }>()
    expect(definition.schema.input['~standard'].vendor).toBe(
      '@open-spaced-repetition/srs-kit'
    )
  })

  it('types field contribution defaults from schema input', () => {
    const defaultCard: FieldDefault<
      (typeof definition.schema)['card'],
      { readonly source: 'test' }
    > = (ctx) => {
      expectTypeOf(ctx).toEqualTypeOf<{ readonly source: 'test' }>()
      return { dueAt: new Date(0) }
    }

    expectTypeOf(defaultCard).returns.toEqualTypeOf<{ dueAt: Date }>()
    expect(defaultCard({ source: 'test' })).toEqual({
      dueAt: new Date(0),
    })
  })
})
