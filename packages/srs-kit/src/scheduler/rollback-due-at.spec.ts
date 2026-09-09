import { describe, expect, it } from 'vitest'
import { dateChrono } from '@/chrono/presets/date/chrono.js'
import { temporalInstantChrono } from '@/chrono/presets/temporal-instant/chrono.js'
import { SM2Model } from '@/model/sm2.test.js'
import { Rating } from '@/primitives/index.js'
import { defineScheduler } from './define-scheduler.js'
import { config } from './scheduler.test.js'

const dateDefinition = defineScheduler({
  model: SM2Model,
  chrono: dateChrono,
})
const dateCore = dateDefinition.create({ config })

const CREATED_AT = new Date('2026-01-01T00:00:00.000Z')
const FIRST_REVIEW = new Date('2026-01-02T00:00:00.000Z')
const SECOND_REVIEW = new Date('2026-01-10T00:00:00.000Z')

describe('rollback restores dueAt', () => {
  it('after the first review of a new card', () => {
    const card = dateCore.newCard({ now: CREATED_AT })
    const reviewed = dateCore.review({
      card,
      grade: Rating.Good,
      now: FIRST_REVIEW,
    })

    const restored = dateCore.rollback(reviewed)

    expect(reviewed.revlog.lastReviewAt).toBeNull()
    expect(restored.dueAt).toEqual(card.dueAt)
    expect(restored.lastReviewAt).toBe(null)
  })

  it('after a second review, when the card carries lastReviewAt', () => {
    const card = dateCore.newCard({ now: CREATED_AT })
    const first = dateCore.review({
      card,
      grade: Rating.Good,
      now: FIRST_REVIEW,
    })
    expect(first.card.lastReviewAt).toEqual(FIRST_REVIEW)

    const second = dateCore.review({
      card: first.card,
      grade: Rating.Good,
      now: SECOND_REVIEW,
    })

    expect(second.revlog.dueAt).toEqual(first.card.dueAt)
    expect(second.revlog.lastReviewAt).toEqual(first.card.lastReviewAt)
    expect(second.revlog.reviewTime).toEqual(SECOND_REVIEW)

    const restored = dateCore.rollback(second)

    expect(restored.dueAt).toEqual(first.card.dueAt)
    expect(restored.lastReviewAt).toEqual(first.card.lastReviewAt)
  })

  it('for an overdue card, without pulling dueAt forward to the review time', () => {
    const card = dateCore.newCard({ now: CREATED_AT })
    const first = dateCore.review({
      card,
      grade: Rating.Good,
      now: FIRST_REVIEW,
    })
    const dueBefore = first.card.dueAt
    expect(dueBefore.getTime()).toBeLessThan(SECOND_REVIEW.getTime())

    const second = dateCore.review({
      card: first.card,
      grade: Rating.Good,
      now: SECOND_REVIEW,
    })
    const restored = dateCore.rollback(second)

    expect(restored.dueAt).toEqual(dueBefore)
    expect(restored.dueAt.getTime()).toBeLessThan(SECOND_REVIEW.getTime())
  })

  it('round-trips dueAt across a review/rollback cycle for any review count', () => {
    let card = dateCore.newCard({ now: CREATED_AT })
    let now = FIRST_REVIEW

    for (let index = 0; index < 4; index += 1) {
      const dueBefore = card.dueAt
      const lastReviewBefore = card.lastReviewAt
      const reviewed = dateCore.review({ card, grade: Rating.Good, now })

      const restored = dateCore.rollback(reviewed)
      expect(restored.dueAt, `review #${index + 1} dueAt`).toEqual(dueBefore)
      expect(
        restored.lastReviewAt,
        `review #${index + 1} lastReviewAt`
      ).toEqual(lastReviewBefore)

      card = reviewed.card
      now = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
    }
  })

  it('rolls back both persisted reviews using a fresh scheduler', () => {
    const card = dateCore.newCard({ now: CREATED_AT })
    const first = dateCore.review({
      card,
      grade: Rating.Good,
      now: FIRST_REVIEW,
    })
    const second = dateCore.review({
      card: first.card,
      grade: Rating.Good,
      now: SECOND_REVIEW,
    })
    const saved: [typeof first, typeof second] = JSON.parse(
      JSON.stringify([first, second]),
      (key, value: unknown) =>
        ['dueAt', 'lastReviewAt', 'reviewTime'].includes(key) &&
        typeof value === 'string'
          ? new Date(value)
          : value
    )
    const reloaded = dateDefinition.create({ config })
    const restored2 = reloaded.rollback(saved[1])
    const restored1 = reloaded.rollback({
      card: restored2,
      revlog: saved[0].revlog,
    })

    expect(restored2).toEqual(first.card)
    expect(restored1).toEqual(card)
  })

  it('unwinds a long review history back to the new card', () => {
    const grades = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]
    const initialCard = dateCore.newCard({ now: CREATED_AT })
    const cardsBefore = [initialCard]
    const results = []
    let card = initialCard
    let now = FIRST_REVIEW

    for (let index = 0; index < 20; index += 1) {
      const grade = grades[index % grades.length]
      const result = dateCore.review({ card, grade, now })

      results.push(result)
      card = result.card
      cardsBefore.push(card)
      now = new Date(card.dueAt.getTime() + (index % 5) * 3 * 60 * 60 * 1000)
    }

    const saved: typeof results = JSON.parse(
      JSON.stringify(results),
      (key, value: unknown) =>
        ['dueAt', 'lastReviewAt', 'reviewTime'].includes(key) &&
        typeof value === 'string'
          ? new Date(value)
          : value
    )
    const reloaded = dateDefinition.create({ config })
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
  })

  it('unwinds a long Temporal review history back to the new card', () => {
    const definition = defineScheduler({
      model: SM2Model,
      chrono: temporalInstantChrono,
    })
    const settings = {
      ...config,
      timezone: 'America/New_York',
      fractionalDays: false,
    }
    const core = definition.create({ config: settings })
    const grades = [Rating.Good, Rating.Again, Rating.Easy, Rating.Hard]
    const initialCard = core.newCard({
      now: Temporal.Instant.from('2026-03-06T07:30:00.123456789Z'),
    })
    const cardsBefore = [initialCard]
    const results = []
    let card = initialCard
    let now = Temporal.Instant.from('2026-03-07T07:30:00.234567891Z')

    for (let index = 0; index < 20; index += 1) {
      const result = core.review({
        card,
        grade: grades[index % grades.length],
        now,
      })

      results.push(result)
      card = result.card
      cardsBefore.push(card)
      now = card.dueAt.add({ hours: index % 7, nanoseconds: index + 1 })
    }

    const saved: typeof results = JSON.parse(
      JSON.stringify(results),
      (key, value: unknown) =>
        ['dueAt', 'lastReviewAt', 'reviewTime'].includes(key) &&
        typeof value === 'string'
          ? Temporal.Instant.from(value)
          : value
    )
    const reloaded = definition.create({ config: settings })
    let restored = reloaded.rollback(saved[saved.length - 1])

    for (let index = saved.length - 1; index >= 0; index -= 1) {
      const expected = cardsBefore[index]
      expect(restored.dueAt.epochNanoseconds, `rollback #${index + 1}`).toBe(
        expected.dueAt.epochNanoseconds
      )
      expect(
        restored.lastReviewAt?.epochNanoseconds ?? null,
        `rollback #${index + 1} lastReviewAt`
      ).toBe(expected.lastReviewAt?.epochNanoseconds ?? null)
      expect(restored).toEqual(expected)
      if (index === 0) break
      restored = reloaded.rollback({
        card: restored,
        revlog: saved[index - 1].revlog,
      })
    }

    expect(restored.lastReviewAt).toBeNull()
  })

  it('preserves an explicitly null previous review time on a non-new card', () => {
    const first = dateCore.review({
      card: dateCore.newCard({ now: CREATED_AT }),
      grade: Rating.Good,
      now: FIRST_REVIEW,
    })
    const card = { ...first.card, lastReviewAt: null }
    const second = dateCore.review({
      card,
      grade: Rating.Good,
      now: SECOND_REVIEW,
    })

    expect(second.revlog.lastReviewAt).toBeNull()
    expect(dateCore.rollback(second)).toEqual(card)
  })

  it('restores persisted Temporal timestamps without losing nanoseconds', () => {
    const definition = defineScheduler({
      model: SM2Model,
      chrono: temporalInstantChrono,
    })
    const settings = {
      ...config,
      timezone: 'America/New_York',
      fractionalDays: false,
    }
    const core = definition.create({ config: settings })
    const card = core.newCard({
      now: Temporal.Instant.from('2026-03-06T07:30:00.123456789Z'),
    })
    const firstTime = Temporal.Instant.from('2026-03-07T07:30:00.234567891Z')
    const first = core.review({ card, grade: Rating.Good, now: firstTime })
    const second = core.review({
      card: first.card,
      grade: Rating.Good,
      now: Temporal.Instant.from('2026-03-10T12:00:00.345678912Z'),
    })
    const saved: [typeof first, typeof second] = JSON.parse(
      JSON.stringify([first, second]),
      (key, value: unknown) =>
        ['dueAt', 'lastReviewAt', 'reviewTime'].includes(key) &&
        typeof value === 'string'
          ? Temporal.Instant.from(value)
          : value
    )
    const reloaded = definition.create({ config: settings })
    const restored2 = reloaded.rollback(saved[1])
    expect(restored2.dueAt.epochNanoseconds).toBe(
      first.card.dueAt.epochNanoseconds
    )
    expect(restored2.lastReviewAt?.epochNanoseconds).toBe(
      firstTime.epochNanoseconds
    )
    const restored1 = reloaded.rollback({
      card: restored2,
      revlog: saved[0].revlog,
    })
    expect(restored1.dueAt.epochNanoseconds).toBe(card.dueAt.epochNanoseconds)
    expect(restored1.lastReviewAt).toBeNull()
  })
})
