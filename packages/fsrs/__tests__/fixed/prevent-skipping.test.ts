// Fixes https://github.com/open-spaced-repetition/ts-fsrs/issues/311
import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
} from 'ts-fsrs'

describe('Prevent skipping of learning steps (#311)', () => {
  const params = generatorParameters({
    enable_fuzz: false,
    enable_short_term: true,
    learning_steps: ['1m', '10m', '30m', '1h', '6h', '12h'],
    relearning_steps: ['10m', '1h', '6h'],
  })
  const f = fsrs(params)

  // Expected due deltas (minutes) for Good at each step: learning_steps[i+1]
  const learningGoodMinutes = [10, 30, 60, 360, 720]
  // Expected due deltas (minutes) for Good at each step: relearning_steps[i+1]
  const relearningGoodMinutes = [60, 360]

  it('should exhaust all learning steps without skipping', () => {
    const emptyCard = createEmptyCard()
    let card = f.next(emptyCard, emptyCard.due, Rating.Again).card
    expect(card.state).toBe(State.Learning)
    expect(card.learning_steps).toBe(0)

    // Good should advance exactly one step at a time (step 0 -> 1 -> 2 -> 3 -> 4 -> 5)
    for (let i = 0; i < learningGoodMinutes.length; i++) {
      const prevDue = card.due
      card = f.next(card, card.due, Rating.Good).card
      expect(card.learning_steps).toBe(i + 1)
      expect(card.state).toBe(State.Learning)
      expect(card.due.getTime() - prevDue.getTime()).toBe(
        learningGoodMinutes[i] * 60 * 1000
      )
    }

    // Final Good at last step should graduate to Review
    expect(card.learning_steps).toBe(5)
    const finalCard = f.next(card, card.due, Rating.Good).card
    expect(finalCard.state).toBe(State.Review)
    expect(finalCard.learning_steps).toBe(0)
  })

  it('should exhaust all relearning steps without skipping', () => {
    const emptyCard = createEmptyCard()
    let card = f.next(emptyCard, emptyCard.due, Rating.Easy).card
    expect(card.state).toBe(State.Review)

    // Lapse -> Relearning at step 0
    card = f.next(card, card.due, Rating.Again).card
    expect(card.state).toBe(State.Relearning)
    expect(card.learning_steps).toBe(0)

    // Good should advance exactly one step at a time (step 0 -> 1 -> 2)
    for (let i = 0; i < relearningGoodMinutes.length; i++) {
      const prevDue = card.due
      card = f.next(card, card.due, Rating.Good).card
      expect(card.learning_steps).toBe(i + 1)
      expect(card.state).toBe(State.Relearning)
      expect(card.due.getTime() - prevDue.getTime()).toBe(
        relearningGoodMinutes[i] * 60 * 1000
      )
    }

    // Final Good at last step should graduate back to Review
    expect(card.learning_steps).toBe(2)
    const finalCard = f.next(card, card.due, Rating.Good).card
    expect(finalCard.state).toBe(State.Review)
    expect(finalCard.learning_steps).toBe(0)
  })
})
