import {
  defineMiddleware,
  defineScheduler,
  type Grade,
  grades,
  Rating,
  type ReviewCandidateContext,
} from '@open-spaced-repetition/srs-kit'
import { dateChrono } from '@open-spaced-repetition/srs-kit/chrono/date'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { FSRS7_DEFAULT_WEIGHTS, FSRS7Model } from '@/models/fsrs-7/index.js'
import { DefaultScheduler } from '@/scheduler/default-scheduler.js'
import { schedulerDesiredRetentionMiddleware } from './middleware.js'
import { desiredRetentionConfigSchema } from './schema.js'

describe('schedulerDesiredRetentionMiddleware', () => {
  it('injects once per candidate without resetting downstream retention on repeated preview', () => {
    expectTypeOf<
      Pick<ReviewCandidateContext, 'desiredRetention'>
    >().toEqualTypeOf<{
      readonly desiredRetention: Record<Grade, number>
    }>()
    const overridden = desiredRetentionConfigSchema.parse({
      desiredRetention: 0.8,
    }).desiredRetention
    const seen: unknown[] = []
    const core = defineScheduler({ model: FSRS7Model, chrono: dateChrono })
      .use(
        schedulerDesiredRetentionMiddleware,
        defineMiddleware({
          name: 'override-after-initial-retention',
          handlers: {
            nextInterval(ctx, next) {
              if (ctx.input.grade === Rating.Again) {
                for (const grade of grades) {
                  ctx.candidate.desiredRetention[grade] = overridden[grade]
                }
              }
              seen.push(ctx.candidate.desiredRetention)
              next()
            },
          },
        })
      )
      .create({
        config: { weights: FSRS7_DEFAULT_WEIGHTS, desiredRetention: 0.9 },
      })
    const now = new Date('2026-01-10T00:00:00Z')
    const card = core.newCard({ now })
    const preview = core.preview({ card, now })
    const first = Array.from(preview)
    expect(Array.from(preview)).toEqual(first)
    expect(seen).toHaveLength(8)
    expect(seen.every((retention) => retention === seen[0])).toBe(true)
    expect(seen[0]).toEqual(overridden)
    expect(core.config.desiredRetention).toEqual(
      desiredRetentionConfigSchema.parse({ desiredRetention: 0.9 })
        .desiredRetention
    )

    core.review({ card, grade: Rating.Hard, now })
    expect(seen.at(-1)).toEqual(core.config.desiredRetention)
    expect(seen.at(-1)).not.toBe(core.config.desiredRetention)
  })

  it('returns issues from safeParse for invalid scalar and per-grade retentions', () => {
    for (const invalid of [NaN, Infinity, 0, 1]) {
      for (const desiredRetention of [
        invalid,
        {
          [Rating.Again]: 0.9,
          [Rating.Hard]: 0.9,
          [Rating.Good]: invalid,
          [Rating.Easy]: 0.9,
        },
      ]) {
        expect(
          desiredRetentionConfigSchema.safeParse({ desiredRetention })
        ).toEqual({
          success: false,
          issues: [{ message: 'Expected desiredRetention in (0, 1)' }],
        })
      }
    }
  })

  it('uses the configured retention for each grade regardless of property declaration order', () => {
    const maps = new Set<unknown>()
    const desiredRetention = {
      [Rating.Easy]: 0.7,
      [Rating.Hard]: 0.85,
      [Rating.Again]: 0.95,
      [Rating.Good]: 0.8,
    }
    const core = defineScheduler({ model: FSRS7Model, chrono: dateChrono })
      .use(
        schedulerDesiredRetentionMiddleware,
        defineMiddleware({
          name: 'observe-desired-retention',
          handlers: {
            review(ctx, next) {
              maps.add(ctx.candidate.desiredRetention)
              next()
            },
          },
        })
      )
      .create({ config: { weights: FSRS7_DEFAULT_WEIGHTS, desiredRetention } })
    const now = new Date('2026-01-10T00:00:00Z')
    const interval = vi.spyOn(core.model, 'nextInterval')
    const preview = core.preview({ card: core.newCard({ now }), now })
    const first = Array.from(preview)
    expect(Array.from(preview)).toEqual(first)
    for (const retentions of maps) {
      expect(retentions).toEqual(desiredRetention)
    }
    expect(interval.mock.calls.map(([, retention]) => retention)).toEqual(
      grades.map((grade) => desiredRetention[grade])
    )
    expect(core.config.desiredRetention).toEqual(desiredRetention)
    expect(core.config.desiredRetention).not.toBe(desiredRetention)
  })

  it.each([
    null,
    { desiredRetention: null },
    { desiredRetention: { [Rating.Good]: 0.9 } },
    {
      desiredRetention: {
        [Rating.Manual]: 0.9,
        [Rating.Again]: 0.9,
        [Rating.Hard]: 0.9,
        [Rating.Good]: 0.9,
      },
    },
    {
      desiredRetention: {
        [Rating.Again]: 0.9,
        [Rating.Hard]: 0.9,
        [Rating.Good]: 0.9,
        [Rating.Easy]: 1,
      },
    },
  ])('rejects invalid per-grade config %#', (value) => {
    expect(() => desiredRetentionConfigSchema.parse(value)).toThrow(
      'Expected desiredRetention in (0, 1)'
    )
  })

  it('injects every grade while preserving the candidate record identity', () => {
    const ctx = {
      config: desiredRetentionConfigSchema.parse({ desiredRetention: 0.9 }),
      input: { grade: Rating.Good },
      candidate: {
        desiredRetention: {
          [Rating.Again]: 0,
          [Rating.Hard]: 0,
          [Rating.Good]: 0,
          [Rating.Easy]: 0,
        },
      },
    }

    const initialRetentions = ctx.candidate.desiredRetention
    schedulerDesiredRetentionMiddleware.handlers!.nextInterval!(
      ctx as never,
      () => {
        expect(ctx.candidate.desiredRetention).toEqual(
          ctx.config.desiredRetention
        )
        expect(ctx.candidate.desiredRetention).toBe(initialRetentions)
        expect(ctx.candidate.desiredRetention).not.toBe(
          ctx.config.desiredRetention
        )
      }
    )
  })

  it.each([0, -0.1, 1, 1.1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects desiredRetention %s outside (0, 1)',
    (desiredRetention) => {
      expect(() =>
        desiredRetentionConfigSchema.parse({ desiredRetention })
      ).toThrow('Expected desiredRetention in (0, 1)')
    }
  )

  it.each([0.1, 0.9, 0.99, 1 - Number.EPSILON])(
    'accepts desiredRetention %s',
    (desiredRetention) => {
      expect(desiredRetentionConfigSchema.parse({ desiredRetention })).toEqual({
        desiredRetention: {
          [Rating.Again]: desiredRetention,
          [Rating.Hard]: desiredRetention,
          [Rating.Good]: desiredRetention,
          [Rating.Easy]: desiredRetention,
        },
      })
    }
  )

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
