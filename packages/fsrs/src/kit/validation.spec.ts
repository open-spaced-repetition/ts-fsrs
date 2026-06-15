import { describe, expect, expectTypeOf, it } from 'vitest'
import { z } from 'zod/mini'
import { FSRSValidationError } from '../error.js'
import { parseOrThrow } from './validation.js'

describe('kit validation', () => {
  it('parses arbitrary zod mini schemas and returns their output type', () => {
    const schema = z.object({
      count: z._default(z.number(), 1),
    })

    const parsed = parseOrThrow(schema, {})

    expect(parsed).toEqual({ count: 1 })
    expectTypeOf(parsed).toEqualTypeOf<{ count: number }>()
  })

  it('throws FSRSValidationError with caller context', () => {
    expect(() => parseOrThrow(z.string(), 1, 'Invalid label')).toThrow(
      FSRSValidationError
    )
    expect(() => parseOrThrow(z.string(), 1, 'Invalid label')).toThrow(
      'Invalid label: 1'
    )
  })
})
