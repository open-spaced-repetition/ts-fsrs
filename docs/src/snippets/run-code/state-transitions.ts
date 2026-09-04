import {
  DefaultScheduler,
  type DefaultSchedulerCard,
  type Grade,
  Rating,
  State,
} from 'ts-fsrs'

const scheduler = await DefaultScheduler({
  learningSteps: ['1m', '10m'],
  relearningSteps: ['10m'],
  enableFuzz: false,
})
const stateNames: Record<State, string> = {
  [State.New]: 'New',
  [State.Learning]: 'Learning',
  [State.Review]: 'Review',
  [State.Relearning]: 'Relearning',
}
const reviewAfterDue = (card: DefaultSchedulerCard, grade: Grade) => {
  const reviewedAt = new Date(card.dueAt.getTime() + 30_000)
  return scheduler.review({ card, grade, now: reviewedAt }).card
}

const newCard = scheduler.newCard({
  cardId: 'state-transitions',
  now: new Date('2026-01-01T00:00:00.000Z'),
})
const learning = reviewAfterDue(newCard, Rating.Again)
const nextLearningStep = reviewAfterDue(learning, Rating.Good)
const graduated = reviewAfterDue(nextLearningStep, Rating.Good)
const reviewed = reviewAfterDue(newCard, Rating.Easy)
const relearning = reviewAfterDue(reviewed, Rating.Again)
const relearned = reviewAfterDue(relearning, Rating.Good)

for (const [from, rating, to] of [
  [newCard, 'Again', learning],
  [learning, 'Good', nextLearningStep],
  [nextLearningStep, 'Good', graduated],
  [newCard, 'Easy', reviewed],
  [reviewed, 'Again', relearning],
  [relearning, 'Good', relearned],
] as const) {
  console.log(
    `${stateNames[from.state]} --${rating}--> ${stateNames[to.state]}`
  )
}
