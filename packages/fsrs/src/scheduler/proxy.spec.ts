import { Rating } from '@open-spaced-repetition/srs-kit'
import { describe, expect, it } from 'vitest'
import { DefaultScheduler } from './default-scheduler.js'
import { createFSRS7MigrationProxy } from './proxy.js'

const DAY = 86_400_000
const NOW = new Date('2026-09-08T23:59:00Z')

describe('FSRS-7 scheduler migration proxy', () => {
  it('preserves an existing FSRS-7 fast trace', () => {
    const scheduler = createFSRS7MigrationProxy({
      review(input: unknown) {
        return input
      },
    })
    const card = { stability: 10, stabilityFast: 20, difficulty: 5 }

    expect(scheduler.review({ card })).toEqual({ card })
  })

  it('leaves a state without finite stability unchanged', () => {
    const scheduler = createFSRS7MigrationProxy({
      review(input: unknown) {
        return input
      },
    })
    const input = { card: { stability: Number.NaN, difficulty: 5 } }

    expect(scheduler.review(input)).toBe(input)
  })

  it('migrates a state-only FSRS-6 card with the 0.8 fast-trace seed', async () => {
    const fsrs6 = await DefaultScheduler({
      version: 'FSRS-6',
      enableShortTerm: false,
      learningSteps: [],
      relearningSteps: [],
    })
    const fsrs7 = await DefaultScheduler({
      version: 'FSRS-7',
      enableShortTerm: false,
      learningSteps: [],
      relearningSteps: [],
    })
    const newCard = fsrs6.newCard({ now: NOW, cardId: 'migration' })
    const firstReviewAt = new Date(NOW.getTime() + 10 * DAY)
    const { card: fsrs6Card } = fsrs6.review({
      card: newCard,
      now: firstReviewAt,
      grade: Rating.Good,
    })
    const explicitFSRS7Card = {
      ...fsrs6Card,
      stabilityFast: fsrs6Card.stability * 0.8,
    }
    const later = new Date(firstReviewAt.getTime() + 10 * DAY)

    const migrated = fsrs7.review({
      card: fsrs6Card as never,
      now: later,
      grade: Rating.Good,
    })
    const direct = fsrs7.review({
      card: explicitFSRS7Card,
      now: later,
      grade: Rating.Good,
    })

    expect(migrated.card).toEqual(direct.card)
    expect(migrated.revlog).toEqual(direct.revlog)
  })
})
