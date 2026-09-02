import { DefaultScheduler } from 'ts-fsrs'

export const now = new Date('2026-01-01T00:00:00.000Z')

export const scheduler = await DefaultScheduler({
  version: 'FSRS-6',
  desiredRetention: 0.9,
})

export const card = scheduler.newCard({ cardId: 'landing-demo', now })

// One row per grade — the panel beside this code is exactly this call.
export const outcomes = scheduler.preview({ card, now })
