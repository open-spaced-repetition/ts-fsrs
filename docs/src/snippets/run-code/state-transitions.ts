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
const afterLearningSteps = reviewAfterDue(nextLearningStep, Rating.Good)
const repeated = reviewAfterDue(nextLearningStep, Rating.Hard)
const restarted = reviewAfterDue(nextLearningStep, Rating.Again)
const reviewed = reviewAfterDue(newCard, Rating.Easy)
const relearning = reviewAfterDue(reviewed, Rating.Again)
const afterRelearningSteps = reviewAfterDue(relearning, Rating.Good)

for (const [from, rating, to] of [
  [newCard, 'Again', learning],
  [learning, 'Good', nextLearningStep],
  [nextLearningStep, 'Hard', repeated],
  [nextLearningStep, 'Again', restarted],
  [nextLearningStep, 'Good', afterLearningSteps],
  [newCard, 'Easy', reviewed],
  [reviewed, 'Again', relearning],
  [relearning, 'Good', afterRelearningSteps],
] as const) {
  console.log(
    `${stateNames[from.state]} --${rating}--> ${stateNames[to.state]}; ` +
      `learningStep: ${from.learningStep} -> ${to.learningStep}; ` +
      `interval: ${(to.scheduledDays * 1440).toFixed(2)}m`
  )
}
