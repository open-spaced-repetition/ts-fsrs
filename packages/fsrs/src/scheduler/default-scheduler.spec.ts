import {
  DefaultScheduler,
  type DefaultSchedulerCard,
  type DefaultSchedulerOptions,
  type Grade,
  Rating,
  State,
} from 'ts-fsrs'
import { FSRS3_DEFAULT_WEIGHTS } from 'ts-fsrs/models/fsrs-3'
import { FSRS4_DEFAULT_WEIGHTS } from 'ts-fsrs/models/fsrs-4'
import { FSRS4Dot5_DEFAULT_WEIGHTS } from 'ts-fsrs/models/fsrs-4dot5'
import { FSRS5_DEFAULT_WEIGHTS } from 'ts-fsrs/models/fsrs-5'
import { FSRS6_DEFAULT_WEIGHTS } from 'ts-fsrs/models/fsrs-6'
import {
  expectFullParity,
  legacyReview,
} from './default-scheduler.legacy-test-utils.js'
import { createStateCard, DAY, NOW } from './default-scheduler.test-utils.js'

describe('DefaultScheduler', () => {
  describe('validation', () => {
    it('delegates review input validation to the scheduler core', async () => {
      const scheduler = await DefaultScheduler()
      const card = createStateCard(State.Review)

      expect(() =>
        scheduler.review({
          card: {
            ...card,
            dueAt: '2025-02-20' as never,
          },
          grade: Rating.Good,
          now: NOW,
        })
      ).toThrow('Expected valid Date fields')
      expect(() =>
        scheduler.review({
          card,
          grade: Rating.Good,
          now: '2025-02-21' as never,
        })
      ).toThrow('Expected valid Date')
    })

    it.each([
      Rating.Manual,
      5,
      1.5,
    ])('rejects review grade %s', async (grade) => {
      const scheduler = await DefaultScheduler()
      const card = scheduler.newCard({ now: NOW, cardId: 'invalid-grade' })

      expect(() =>
        scheduler.review({ card, grade: grade as Grade, now: NOW })
      ).toThrow('Expected grade')
    })

    it('rejects Manual revlogs during rollback', async () => {
      const scheduler = await DefaultScheduler()
      const reviewed = scheduler.review({
        card: scheduler.newCard({ now: NOW, cardId: 'manual' }),
        grade: Rating.Good,
        now: NOW,
      })

      expect(() =>
        scheduler.rollback({
          card: reviewed.card,
          revlog: { ...reviewed.revlog, rating: Rating.Manual as never },
        })
      ).toThrow('Expected grade')
    })
  })

  describe('version presets', () => {
    it.each([
      ['FSRS-4', FSRS4_DEFAULT_WEIGHTS],
      ['FSRS-5', FSRS5_DEFAULT_WEIGHTS],
      ['FSRS-6', FSRS6_DEFAULT_WEIGHTS],
    ] as const)('migrates %s weights before scheduling', async (_name, weights) => {
      const options = {
        weights,
        enableShortTerm: true,
      } satisfies DefaultSchedulerOptions
      const scheduler = await DefaultScheduler(options)
      const card = scheduler.newCard({
        now: NOW,
        cardId: `migrate-${weights.length}`,
      })
      const actual = scheduler.review({
        card,
        grade: Rating.Good,
        now: NOW,
      })

      expectFullParity(actual, legacyReview(options, card, NOW, Rating.Good))
    })

    it.each([
      ['FSRS-3', FSRS3_DEFAULT_WEIGHTS],
      ['FSRS-4', FSRS4_DEFAULT_WEIGHTS],
      ['FSRS-4.5', FSRS4Dot5_DEFAULT_WEIGHTS],
      ['FSRS-5', FSRS5_DEFAULT_WEIGHTS],
      ['FSRS-6', FSRS6_DEFAULT_WEIGHTS],
    ] as const)('uses the %s model and parameter migrator', async (version, weights) => {
      const scheduler = await DefaultScheduler({ version })
      const card = scheduler.newCard({ now: NOW, cardId: version })
      const result = scheduler.review({
        card,
        grade: Rating.Again,
        now: NOW,
      })

      expect(result.card.stability).toBe(weights[Rating.Again - 1])
    })

    it('defaults to FSRS-6', async () => {
      const defaultScheduler = await DefaultScheduler()
      const card = defaultScheduler.newCard({ now: NOW, cardId: 'fsrs-6' })
      const review = (scheduler: DefaultScheduler) =>
        scheduler.review({ card, grade: Rating.Good, now: NOW })
      const defaultResult = review(defaultScheduler)

      expect(defaultResult.card.stability).toBe(
        FSRS6_DEFAULT_WEIGHTS[Rating.Good - 1]
      )
      expect(defaultResult).toEqual(
        review(await DefaultScheduler({ version: 'FSRS-6' }))
      )
    })

    it('rejects unsupported FSRS versions clearly', async () => {
      await expect(
        DefaultScheduler({ version: 'FSRS-7' as never })
      ).rejects.toThrow('Unsupported FSRS version "FSRS-7"')
    })
  })

  describe('public API', () => {
    it('creates a card with a caller-provided cardId without config', async () => {
      const card = (await DefaultScheduler()).newCard({
        now: NOW,
        cardId: 'test-card-id',
      })

      expect(card.cardId).toBe('test-card-id')
      expect(card.dueAt).toEqual(NOW)
    })

    it('preserves cardId through review, rollback, and forget', async () => {
      const scheduler = await DefaultScheduler()
      const card = scheduler.newCard({ now: NOW, cardId: 42 })
      const reviewed = scheduler.review({
        card,
        grade: Rating.Easy,
        now: NOW,
      })
      const rolledBack = scheduler.rollback(reviewed)
      const forgotten = scheduler.forget({
        card: reviewed.card,
        now: new Date(NOW.getTime() + DAY),
      })

      expect(reviewed.card.cardId).toBe(42)
      expect(rolledBack.cardId).toBe(42)
      expect(forgotten.cardId).toBe(42)
    })

    it.each([
      true,
      false,
    ])('returns the core forget card with clearStatsOnForget=%s', async (clearStatsOnForget) => {
      const scheduler = await DefaultScheduler({ clearStatsOnForget })
      const card: DefaultSchedulerCard = {
        cardId: 'forget-card',
        dueAt: new Date(NOW.getTime() + 2 * DAY),
        stability: 9.5,
        difficulty: 4.5,
        scheduledDays: 9,
        learningStep: 1,
        reps: 12,
        lapses: 3,
        state: State.Relearning,
        scheduleStatus: 'learning',
        lastReviewAt: new Date(NOW.getTime() - 7 * DAY),
      }

      const actual = scheduler.forget({
        card,
        now: NOW,
      })

      expect(actual).toEqual({
        cardId: card.cardId,
        dueAt: NOW,
        stability: 0,
        difficulty: 0,
        scheduledDays: 0,
        learningStep: 0,
        reps: clearStatsOnForget ? 0 : card.reps,
        lapses: clearStatsOnForget ? 0 : card.lapses,
        state: State.New,
        scheduleStatus: 'new',
        lastReviewAt: null,
      })
    })
  })

  describe('options', () => {
    it('honors desiredRetention and remains equal to the legacy scheduler', async () => {
      const card = {
        ...createStateCard(State.Review),
        stability: 35,
        cardId: 'retention',
      }
      const lowRetention = { desiredRetention: 0.8 }
      const highRetention = { desiredRetention: 0.95 }
      const low = (await DefaultScheduler(lowRetention)).review({
        card,
        grade: Rating.Good,
        now: NOW,
      })
      const high = (await DefaultScheduler(highRetention)).review({
        card,
        grade: Rating.Good,
        now: NOW,
      })

      expectFullParity(low, legacyReview(lowRetention, card, NOW, Rating.Good))
      expectFullParity(
        high,
        legacyReview(highRetention, card, NOW, Rating.Good)
      )
      expect(low.card.scheduledDays).toBeGreaterThan(high.card.scheduledDays)
    })

    it('snapshots mutable learning-step parameters before lazy preview iteration', async () => {
      const learningSteps: Array<'1m' | '1d'> = ['1m']
      const relearningSteps: Array<'10m' | '1d'> = ['10m']
      const options = { learningSteps, relearningSteps }
      const scheduler = await DefaultScheduler(options)
      const card = scheduler.newCard({
        now: NOW,
        cardId: 'mutable-step-parameters',
      })
      const expected = structuredClone(
        legacyReview(options, card, NOW, Rating.Again)
      )
      const preview = scheduler.preview({
        card,
        now: NOW,
      })

      learningSteps[0] = '1d'
      relearningSteps[0] = '1d'

      expectFullParity(Array.from(preview)[0], expected)
    })
  })

  describe('middleware composition', () => {
    it('wires cardId-based fuzzing', async () => {
      const scheduler = await DefaultScheduler({ enableFuzz: true })
      const firstCard = {
        ...createStateCard(State.Review),
        cardId: 'fuzz-card-a',
        stability: 80,
      }
      const secondCard = { ...firstCard, cardId: 'fuzz-card-b' }
      const scheduledDays = (card: DefaultSchedulerCard) =>
        Array.from(
          scheduler.preview({ card, now: NOW }),
          (item) => item.card.scheduledDays
        )
      const first = scheduledDays(firstCard)

      expect(first).toEqual(scheduledDays(firstCard))
      expect(first).not.toEqual(scheduledDays(secondCard))
    })
  })
})
