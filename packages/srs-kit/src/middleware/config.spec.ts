import { describe, expectTypeOf, it } from 'vitest'
import { defineSchema } from '@/schema/index.js'
import type { MiddlewareConfigPart } from './config.js'
import { defineMiddleware } from './middleware.js'

const normalizedConfigMiddleware = defineMiddleware({
  name: 'normalizedConfig',
  schema: {
    config: defineSchema<unknown, { readonly normalizedSource: string }>(
      (value) => {
        if (
          typeof value !== 'object' ||
          value === null ||
          !('rawSource' in value) ||
          typeof value.rawSource !== 'string'
        ) {
          return { issues: [{ message: 'Expected rawSource config' }] }
        }

        return {
          value: {
            normalizedSource: value.rawSource.trim(),
          },
        }
      }
    ),
  },
})

describe('MiddlewareConfigPart', () => {
  it('preserves output config fields when input is unknown', () => {
    type Middlewares = readonly [typeof normalizedConfigMiddleware]

    expectTypeOf<MiddlewareConfigPart<Middlewares, 'input'>>().toEqualTypeOf<
      Record<never, never>
    >()
    expectTypeOf<MiddlewareConfigPart<Middlewares, 'output'>>().toEqualTypeOf<{
      readonly normalizedSource: string
    }>()
  })
})
