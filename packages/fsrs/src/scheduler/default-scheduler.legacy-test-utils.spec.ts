import { FSRS, Rating, State } from 'ts-fsrs'
import { expect, it, vi } from 'vitest'
import {
  legacyNext,
  legacyReview,
} from './default-scheduler.legacy-test-utils.js'
import { createStateCard, NOW } from './default-scheduler.test-utils.js'

it('normalizes an absent legacy last_review to null', () => {
  const card = createStateCard(State.New)
  const result = legacyNext({}, card, NOW, Rating.Good)
  delete result.card.last_review
  const next = vi.spyOn(FSRS.prototype, 'next').mockReturnValue(result)
  try {
    const converted = legacyReview({}, card, NOW, Rating.Good)
    expect(converted.card.lastReviewAt).toBeNull()
    expect(converted.card.cardId).toBe(card.cardId)
    expect(converted.revlog.reviewTime).toEqual(NOW)
  } finally {
    next.mockRestore()
  }
})
