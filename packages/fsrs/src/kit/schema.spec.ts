import { defineMiddleware } from 'ts-fsrs'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { FSRSMemoryStateSchema } from './schema.js'
import { isNumberArray } from './schema-utils.js'

describe('FSRS schemas', () => {
  it('rejects an invalid memory state', () => {
    expect(() =>
      FSRSMemoryStateSchema.parse({ stability: '1', difficulty: 2 })
    ).toThrow('Expected FSRS memory state')
  })

  it('rejects non-number and non-finite array items', () => {
    expect(isNumberArray(['1'])).toBe(false)
    expect(isNumberArray([Number.NaN])).toBe(false)
  })

  it('accepts Zod Standard Schemas', () => {
    const configSchema = z.object({ enabled: z.boolean() })
    const middleware = defineMiddleware({
      name: 'zod-config',
      schema: { config: configSchema },
    })

    expect(middleware.schema?.config).toBe(configSchema)
  })
})
