import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import type { SchemaOutput, StandardSchemaV1 } from './index.js'
import { defineSchema, parse, SRSSchemaError } from './validators.js'

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

  it('parse() validates via ~standard and returns value', () => {
    expect(parse(sizeSchema, 'small')).toBe('small')
  })

  it('parse() throws SRSSchemaError on invalid input', () => {
    expect(() => parse(sizeSchema, 'medium')).toThrow(SRSSchemaError)
  })

  it('rejects async Standard Schema validation and logs rejections', async () => {
    const error = new Error('Validation failed')
    const logger = vi.spyOn(console, 'error').mockImplementation(() => {})
    const schema: StandardSchemaV1<string> = {
      '~standard': {
        version: 1,
        vendor: 'test',
        async validate() {
          throw error
        },
      },
    }

    expect(() => parse(schema, 'value')).toThrow(
      'Async Standard Schema validation is not supported'
    )
    await Promise.resolve()
    expect(logger).toHaveBeenCalledWith(
      'Async Standard Schema validation rejected',
      error
    )
    logger.mockRestore()
  })
})
