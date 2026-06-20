import type { StandardSchemaV1 } from '@standard-schema/spec'
import { describe, expect, expectTypeOf, it } from 'vitest'
import * as z from 'zod/mini'
import {
  ModelSchemaError,
  type SchemaOutput,
  validateSchema,
} from './standard.js'

describe('standard schema helpers', () => {
  it('validates a Standard Schema result', async () => {
    const schema = z.enum(['small', 'large'])

    await expect(validateSchema(schema, 'small')).resolves.toBe('small')
    expectTypeOf<SchemaOutput<typeof schema>>().toEqualTypeOf<
      'small' | 'large'
    >()
  })

  it('throws ModelSchemaError with Standard Schema issues', async () => {
    const schema = z.enum(['small', 'large'])

    await expect(validateSchema(schema, 'medium')).rejects.toMatchObject({
      name: 'ModelSchemaError',
    })
  })

  it('uses a fallback message when a schema reports no issues', () => {
    const error = new ModelSchemaError([])

    expect(error.message).toBe('Model schema validation failed')
  })

  it('supports async Standard Schema validators', async () => {
    const schema = {
      '~standard': {
        version: 1,
        vendor: 'test',
        async validate(value) {
          return typeof value === 'number'
            ? { value }
            : { issues: [{ message: 'Expected number' }] }
        },
      },
    } satisfies StandardSchemaV1<number, number>

    await expect(validateSchema(schema, 1)).resolves.toBe(1)
  })
})
