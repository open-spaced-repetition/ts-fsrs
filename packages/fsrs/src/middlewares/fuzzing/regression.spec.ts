import { describe, expect, it } from 'vitest'
import { createEmptyCard } from '../../default.js'
import { fsrs } from '../../fsrs.js'
import { Rating } from '../../models.js'

describe.each([
  ['short-term', true],
  ['long-term', false],
] as const)('legacy fuzz same-seed regression (%s)', (_label, enableShortTerm) => {
  it('returns the same due time for repeated identical scheduling', () => {
    const firstReview = new Date('2024-08-15T00:00:00.000Z')
    const reviewTime = new Date('2024-08-18T00:00:00.000Z')
    const initial = fsrs({ enable_short_term: enableShortTerm }).next(
      createEmptyCard(),
      firstReview,
      Rating.Good
    ).card
    const scheduler = fsrs({
      enable_fuzz: true,
      enable_short_term: enableShortTerm,
    })
    const dueTimes = Array.from({ length: 100 }, () =>
      scheduler.next(initial, reviewTime, Rating.Good).card.due.getTime()
    )

    expect(dueTimes.every((dueTime) => dueTime === dueTimes[0])).toBe(true)
  })
})
