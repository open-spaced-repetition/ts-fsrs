import { describe, expect, it } from 'vitest'
import { DefaultScheduler } from '@/scheduler/default-scheduler.js'
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
    1,
    1.1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ])('rejects desiredRetention %s outside (0, 1)', (desiredRetention) => {
    expect(() =>
      desiredRetentionConfigSchema.parse({ desiredRetention })
    ).toThrow('Expected desiredRetention in (0, 1)')
  })

  it.each([
    0.1,
    0.9,
    0.99,
    1 - Number.EPSILON,
  ])('accepts desiredRetention %s', (desiredRetention) => {
    expect(desiredRetentionConfigSchema.parse({ desiredRetention })).toEqual({
      desiredRetention,
    })
  })

  it.each([
    'FSRS-3',
    'FSRS-4',
    'FSRS-4.5',
    'FSRS-5',
    'FSRS-6',
    'FSRS-7',
  ] as const)('rejects retention 1 when creating %s', async (version) => {
    await expect(
      DefaultScheduler({ version, desiredRetention: 1 })
    ).rejects.toThrow('Expected desiredRetention in (0, 1)')
  })
})
