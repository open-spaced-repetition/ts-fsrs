import { DefaultScheduler } from 'ts-fsrs'

const createdAt = new Date('2026-01-01T00:00:00.000Z')
export const now = new Date('2026-01-02T09:30:00.000Z')

export const scheduler = await DefaultScheduler({
  version: 'FSRS-6',
  desiredRetention: 0.9,
})

export const card = scheduler.newCard({
  cardId: 'landing-demo',
  now: createdAt,
})

// One `{ grade, card, revlog }` row per grade — the panel renders exactly this.
export const outcomes = scheduler.preview({ card, now })
