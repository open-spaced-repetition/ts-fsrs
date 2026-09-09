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
  it.each([
    false,
    true,
  ])('restores persisted reviews with fuzz and short term %s', async (enableShortTerm) => {
    const options = { enableShortTerm, enableFuzz: true }
    const scheduler = await DefaultScheduler(options)
    const reloaded = await DefaultScheduler(options)
    let card = scheduler.newCard({
      now: new Date('2026-01-01T00:00:00Z'),
      cardId: 'persisted-rollback',
    })
    let seed = 12345
    const grades = [
      Rating.Again,
      Rating.Hard,
      Rating.Good,
      Rating.Easy,
    ] as const

    for (let index = 0; index < 200; index += 1) {
      seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0
      const now = new Date(card.dueAt.getTime() + (seed % 240) * 3_600_000)
      const result = scheduler.review({
        card,
        grade: grades[(seed >>> 24) % grades.length],
        now,
      })
      const saved: typeof result = JSON.parse(
        JSON.stringify(result),
        (key, value: unknown) =>
          ['dueAt', 'lastReviewAt', 'reviewTime'].includes(key) &&
          typeof value === 'string'
            ? new Date(value)
            : value
      )
      expect(reloaded.rollback(saved)).toEqual(card)
      card = result.card
    }
  })

  it.each([
    false,
    true,
  ])('unwinds a persisted history back to the new card with short term %s', async (enableShortTerm) => {
    const options = { enableShortTerm, enableFuzz: true }
    const scheduler = await DefaultScheduler(options)
    const reloaded = await DefaultScheduler(options)
    const initialCard = scheduler.newCard({
      now: new Date('2026-01-01T00:00:00Z'),
      cardId: 'unwind-rollback',
    })
    const grades = [
      Rating.Again,
      Rating.Hard,
      Rating.Good,
      Rating.Easy,
    ] as const
    const cardsBefore = [initialCard]
    const results = []
    let card = initialCard
    let seed = 987_654_321

    for (let index = 0; index < 50; index += 1) {
      seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0
      const result = scheduler.review({
        card,
        grade: grades[(seed >>> 24) % grades.length],
        now: new Date(card.dueAt.getTime() + (seed % 240) * 3_600_000),
      })

      results.push(result)
      card = result.card
      cardsBefore.push(card)
    }

    const saved: typeof results = JSON.parse(
      JSON.stringify(results),
      (key, value: unknown) =>
        ['dueAt', 'lastReviewAt', 'reviewTime'].includes(key) &&
        typeof value === 'string'
          ? new Date(value)
          : value
    )
    let restored = reloaded.rollback(saved[saved.length - 1])

    for (let index = saved.length - 1; index >= 0; index -= 1) {
      expect(restored, `rollback #${index + 1}`).toEqual(cardsBefore[index])
      if (index === 0) break
      restored = reloaded.rollback({
        card: restored,
        revlog: saved[index - 1].revlog,
      })
    }

    expect(restored).toEqual(initialCard)
    expect(restored.lastReviewAt).toBeNull()
    expect(restored.state).toBe(State.New)
  })

  it('distinguishes review histories with identical due dates and memory states', async () => {
    const weights = Array.from(FSRS6_DEFAULT_WEIGHTS)
    weights[0] = weights[1] = weights[4] = weights[5] = 1
    const scheduler = await DefaultScheduler({
      weights,
      enableShortTerm: true,
      enableFuzz: false,
    })
    const original = scheduler.newCard({
      now: new Date('2026-01-01T00:00:00Z'),
      cardId: 'same-due',
    })
    const firstA = scheduler.review({
      card: original,
      grade: Rating.Again,
      now: new Date('2026-01-02T12:04:30Z'),
    })
    const firstB = scheduler.review({
      card: original,
      grade: Rating.Hard,
      now: new Date('2026-01-02T12:00:00Z'),
    })
    const now = new Date('2026-01-03T12:00:00Z')
    const secondA = scheduler.review({
      card: firstA.card,
      grade: Rating.Good,
      now,
    })
    const secondB = scheduler.review({
      card: firstB.card,
      grade: Rating.Good,
      now,
    })

    expect(firstA.card.dueAt).toEqual(firstB.card.dueAt)
    expect(firstA.card.stability).toBe(firstB.card.stability)
    expect(firstA.card.difficulty).toBe(firstB.card.difficulty)
    expect(secondA.revlog.lastReviewAt).not.toEqual(secondB.revlog.lastReviewAt)
    expect(scheduler.rollback(secondA)).toEqual(firstA.card)
    expect(scheduler.rollback(secondB)).toEqual(firstB.card)
  })

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
