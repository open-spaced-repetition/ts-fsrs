// Fixes https://github.com/open-spaced-repetition/ts-fsrs/issues/311

import { Rating, State } from '@open-spaced-repetition/srs-kit'
import { describe, expect, it } from 'vitest'
import { createEmptyCard } from '@/legacy/default.js'
import { fsrs } from '@/legacy/fsrs.js'

describe('learning-step regression #311', () => {
  const scheduler = fsrs({
    enable_fuzz: false,
    enable_short_term: true,
    learning_steps: ['1m', '10m', '30m', '1h', '6h', '12h'],
    relearning_steps: ['10m', '1h', '6h'],
  })

  it('exhausts all learning steps without skipping', () => {
    const emptyCard = createEmptyCard()
    let card = scheduler.next(emptyCard, emptyCard.due, Rating.Again).card
    expect(card.state).toBe(State.Learning)
    expect(card.learning_steps).toBe(0)

    for (const [index, minutes] of [10, 30, 60, 360, 720].entries()) {
      const previousDue = card.due
      card = scheduler.next(card, card.due, Rating.Good).card
      expect(card.learning_steps).toBe(index + 1)
      expect(card.state).toBe(State.Learning)
      expect(card.due.getTime() - previousDue.getTime()).toBe(minutes * 60_000)
    }

    const finalCard = scheduler.next(card, card.due, Rating.Good).card
    expect(finalCard.state).toBe(State.Review)
    expect(finalCard.learning_steps).toBe(0)
  })

  it('exhausts all relearning steps without skipping', () => {
    const emptyCard = createEmptyCard()
    let card = scheduler.next(emptyCard, emptyCard.due, Rating.Easy).card
    card = scheduler.next(card, card.due, Rating.Again).card
    expect(card.state).toBe(State.Relearning)
    expect(card.learning_steps).toBe(0)

    for (const [index, minutes] of [60, 360].entries()) {
      const previousDue = card.due
      card = scheduler.next(card, card.due, Rating.Good).card
      expect(card.learning_steps).toBe(index + 1)
      expect(card.state).toBe(State.Relearning)
      expect(card.due.getTime() - previousDue.getTime()).toBe(minutes * 60_000)
    }

    const finalCard = scheduler.next(card, card.due, Rating.Good).card
    expect(finalCard.state).toBe(State.Review)
    expect(finalCard.learning_steps).toBe(0)
  })
})
