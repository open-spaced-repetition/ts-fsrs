import { DefaultScheduler, Rating } from 'ts-fsrs'

const now = new Date('2026-01-01T00:00:00.000Z')
const scheduler = await DefaultScheduler({
  version: 'FSRS-6',
  desiredRetention: 0.9,
  enableShortTerm: true,
  learningSteps: ['1m', '10m'],
  relearningSteps: ['10m'],
  enableFuzz: false,
  maximumInterval: 36_500,
})
const card = scheduler.newCard({ cardId: 'quick-start', now })
const result = scheduler.review({ card, grade: Rating.Good, now })

console.log(
  JSON.stringify(
    {
      state: result.card.state,
      dueAt: result.card.dueAt,
      stability: result.card.stability,
      rating: result.revlog.rating,
    },
    null,
    2
  )
)
