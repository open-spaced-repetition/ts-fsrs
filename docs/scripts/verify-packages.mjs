import assert from 'node:assert/strict'
import { FSRSBinding } from '@open-spaced-repetition/binding-wasm32-wasip1'
import { dateChrono, defineScheduler, Rating } from 'ts-fsrs'
import { FSRS6_DEFAULT_WEIGHTS, FSRS6Model } from 'ts-fsrs/models/fsrs-6'

const schedulerDefinition = defineScheduler({
  model: FSRS6Model,
  chrono: dateChrono,
})

const now = new Date('2026-01-01T00:00:00.000Z')
const scheduler = schedulerDefinition.create({
  config: {
    weights: FSRS6_DEFAULT_WEIGHTS,
    enableShortTerm: true,
    numRelearningSteps: 1,
  },
})
const reviewed = scheduler.review({
  card: scheduler.newCard({ now }),
  grade: Rating.Good,
  now,
})
assert(reviewed.card.dueAt instanceof Date)

const states = new FSRSBinding().nextStates(null, 0.9, 0)
for (const state of [states.again, states.hard, states.good, states.easy]) {
  assert.equal(typeof state.interval, 'number')
}
