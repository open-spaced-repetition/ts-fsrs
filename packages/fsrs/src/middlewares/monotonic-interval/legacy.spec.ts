import { describe, expect, it } from 'vitest'
import { createEmptyCard } from '../../default.js'
import { fsrs } from '../../fsrs.js'
import { dateDiffInDays } from '../../help.js'
import { type Card, type Grade, Rating, State } from '../../models.js'
import { calculateScheduleDays } from './core.js'

const DAY = 24 * 60 * 60 * 1000
const MINUTE = 60 * 1000
const grades = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const

type LegacyScheduler = ReturnType<typeof fsrs>

function rawInterval(
  scheduler: LegacyScheduler,
  card: Card,
  now: Date,
  grade: Grade
): number {
  const elapsedDays = card.last_review
    ? dateDiffInDays(card.last_review, now)
    : 0
  const nextMemoryState = scheduler.model.step({
    memoryState: card,
    elapsedDays,
    rating: grade,
    retrievability:
      card.state === State.New
        ? undefined
        : scheduler.model.forgettingCurve(card, elapsedDays),
  })

  return Math.round(
    scheduler.model.nextInterval(
      nextMemoryState,
      scheduler.parameters.request_retention
    )
  )
}

function expectedLongTermSchedule(
  scheduler: LegacyScheduler,
  card: Card,
  now: Date
): number[] {
  return calculateScheduleDays(
    [
      rawInterval(scheduler, card, now, Rating.Again),
      rawInterval(scheduler, card, now, Rating.Hard),
      rawInterval(scheduler, card, now, Rating.Good),
      rawInterval(scheduler, card, now, Rating.Easy),
    ],
    scheduler.parameters.maximum_interval
  )
}

function expectedShortTermReviewSchedule(
  scheduler: LegacyScheduler,
  card: Card,
  now: Date
): number[] {
  return calculateScheduleDays(
    [
      rawInterval(scheduler, card, now, Rating.Hard),
      rawInterval(scheduler, card, now, Rating.Good),
      rawInterval(scheduler, card, now, Rating.Easy),
    ],
    scheduler.parameters.maximum_interval
  )
}

function expectPublicDaySchedule(
  scheduler: LegacyScheduler,
  card: Card,
  now: Date,
  expected: readonly number[],
  ratings: readonly Grade[] = grades
): void {
  const record = scheduler.repeat(card, now)

  expect(ratings.map((rating) => record[rating].card.scheduled_days)).toEqual(
    expected
  )

  ratings.forEach((rating, index) => {
    const next = scheduler.next(card, now, rating)
    expect(next).toEqual(record[rating])
    expect(next.card.scheduled_days).toBe(expected[index])
    expect(next.card.due.getTime() - now.getTime()).toBe(expected[index] * DAY)
  })
}

describe('legacy FSRS monotonic interval integration', () => {
  const start = new Date('2026-01-01T00:00:00.000Z')

  it('keeps all long-term new-card ratings on the four-grade chain', () => {
    const scheduler = fsrs({
      enable_fuzz: false,
      enable_short_term: false,
    })
    const card = createEmptyCard(start)
    const expected = expectedLongTermSchedule(scheduler, card, start)

    expect(expected).toEqual([1, 2, 3, 8])
    expectPublicDaySchedule(scheduler, card, start, expected)
  })

  it('keeps all long-term review ratings on the four-grade chain', () => {
    const scheduler = fsrs({
      enable_fuzz: false,
      enable_short_term: false,
    })
    const card = scheduler.next(createEmptyCard(start), start, Rating.Easy).card
    const now = card.due
    const expected = expectedLongTermSchedule(scheduler, card, now)

    expect(expected).toEqual([1, 27, 39, 66])
    expectPublicDaySchedule(scheduler, card, now, expected)
  })

  it('keeps fuzzing before the long-term monotonic chain', () => {
    const scheduler = fsrs({
      enable_fuzz: true,
      enable_short_term: false,
    })
    const card = scheduler.next(createEmptyCard(start), start, Rating.Easy).card
    const now = card.due

    expectPublicDaySchedule(scheduler, card, now, [1, 28, 40, 68])
  })

  it('keeps Again outside the short-term Review day chain', () => {
    const scheduler = fsrs({
      enable_fuzz: false,
      enable_short_term: true,
      relearning_steps: ['10m'],
    })
    const card = scheduler.next(createEmptyCard(start), start, Rating.Easy).card
    const now = card.due
    const expected = expectedShortTermReviewSchedule(scheduler, card, now)

    expect(expected).toEqual([27, 39, 66])
    expectPublicDaySchedule(scheduler, card, now, expected, grades.slice(1))

    const record = scheduler.repeat(card, now)
    const nextAgain = scheduler.next(card, now, Rating.Again)
    expect(nextAgain).toEqual(record[Rating.Again])
    expect(nextAgain.card.state).toBe(State.Relearning)
    expect(nextAgain.card.scheduled_days).toBe(0)
    expect(nextAgain.card.due.getTime() - now.getTime()).toBe(10 * MINUTE)
  })

  it('saturates later long-term ratings at maximum_interval', () => {
    const scheduler = fsrs({
      enable_fuzz: false,
      enable_short_term: false,
      maximum_interval: 2,
    })
    const card = createEmptyCard(start)
    const expected = expectedLongTermSchedule(scheduler, card, start)

    expect(expected).toEqual([1, 2, 2, 2])
    expectPublicDaySchedule(scheduler, card, start, expected)
  })
})
