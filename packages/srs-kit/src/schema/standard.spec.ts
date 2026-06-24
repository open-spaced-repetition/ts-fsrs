import { describe, expect, expectTypeOf, it } from 'vitest'
import { defineSchema, type SchemaOutput, SRSSchemaError } from './standard.js'

const sizeSchema = defineSchema<'small' | 'large'>((value) =>
  value === 'small' || value === 'large'
    ? { value }
    : { issues: [{ message: 'Expected size' }] }
)

describe('standard schema helpers', () => {
  it('validates a Standard Schema result', () => {
    expect(sizeSchema.parse('small')).toBe('small')
    expectTypeOf<SchemaOutput<typeof sizeSchema>>().toEqualTypeOf<
      'small' | 'large'
    >()
  })

  it('safeParse returns success/failure without throwing', () => {
    const success = sizeSchema.safeParse('small')
    expect(success).toEqual({ success: true, data: 'small' })

    const failure = sizeSchema.safeParse('medium')
    expect(failure).toEqual({
      success: false,
      issues: [{ message: 'Expected size' }],
    })
  })

  it('throws SRSSchemaError with Standard Schema issues', () => {
    expect(() => sizeSchema.parse('medium')).toThrow(SRSSchemaError)
    expect(() => sizeSchema.parse('medium')).toThrow(
      expect.objectContaining({
        name: 'SRSSchemaError',
        issues: [{ message: 'Expected size' }],
      })
    )
  })
})
