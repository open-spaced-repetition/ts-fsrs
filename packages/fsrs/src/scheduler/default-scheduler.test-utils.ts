import { DefaultScheduler, type DefaultSchedulerCard, State } from 'ts-fsrs'

export const DAY = 86_400_000
export const NOW = new Date('2025-02-20T12:00:00.000Z')
const cardFactory = await DefaultScheduler()
export const scheduleStatusByState = {
  [State.New]: 'new',
  [State.Learning]: 'learning',
  [State.Review]: 'review',
  [State.Relearning]: 'learning',
} as const satisfies Record<State, DefaultSchedulerCard['scheduleStatus']>

export function createStateCard(state: State): DefaultSchedulerCard {
  const cardId = `card-${state}`
  if (state === State.New) {
    return cardFactory.newCard({
      now: new Date('2025-01-05T03:04:05.000Z'),
      cardId,
    })
  }

  const shared = {
    cardId,
    dueAt: NOW,
    scheduledDays: 10,
    reps: 8,
    lastReviewAt: new Date(NOW.getTime() - 10 * DAY),
    scheduleStatus: scheduleStatusByState[state],
  }

  switch (state) {
    case State.Learning:
      return {
        ...shared,
        stability: 1.4,
        difficulty: 6.4,
        learningStep: 1,
        lapses: 0,
        state,
      }
    case State.Review:
      return {
        ...shared,
        stability: 12.4,
        difficulty: 5.2,
        learningStep: 0,
        lapses: 1,
        state,
      }
    case State.Relearning:
      return {
        ...shared,
        stability: 2.8,
        difficulty: 7.1,
        learningStep: 1,
        lapses: 2,
        state,
      }
  }
}
