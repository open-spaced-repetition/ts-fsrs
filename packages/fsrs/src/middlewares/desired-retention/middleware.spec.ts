import { describe, expect, it } from 'vitest'
import { schedulerDesiredRetentionMiddleware } from './middleware.js'
import { desiredRetentionConfigSchema } from './schema.js'

describe('schedulerDesiredRetentionMiddleware', () => {
  it('injects desiredRetention before the remaining review chain', () => {
    const ctx = {
      config: { desiredRetention: 0.9 },
      desiredRetention: 0,
    }

    schedulerDesiredRetentionMiddleware.handlers!.review!(ctx as never, () => {
      expect(ctx.desiredRetention).toBe(0.9)
    })
  })

  it.each([
    0,
    -0.1,
    1.1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ])('rejects desiredRetention %s outside (0, 1]', (desiredRetention) => {
    expect(() =>
      desiredRetentionConfigSchema.parse({ desiredRetention })
    ).toThrow()
  })

  it.each([0.1, 0.9, 1])('accepts desiredRetention %s', (desiredRetention) => {
    expect(desiredRetentionConfigSchema.parse({ desiredRetention })).toEqual({
      desiredRetention,
    })
  })
})
