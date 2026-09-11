import { dateChrono, defineScheduler, Rating } from 'ts-fsrs'
import {
  checkFSRS6Parameters,
  clipFSRS6Parameters,
  computeDecayFactor,
  FSRS6_DECAY,
  FSRS6_DEFAULT_WEIGHTS,
  FSRS6_MODEL_BOUNDS,
  FSRS6Model,
  migrateFSRS6Parameters,
} from 'ts-fsrs/models/fsrs-6'

// Bounds the model clamps weights into.
console.log(JSON.stringify(FSRS6_MODEL_BOUNDS))

// clip pulls out-of-range weights back to the nearest bound; check throws instead.
console.log(JSON.stringify({ w0: clipFSRS6Parameters([-999])[0] }))
console.log(
  JSON.stringify({
    accepted: checkFSRS6Parameters(FSRS6_DEFAULT_WEIGHTS).length,
  })
)

// migrate fills a shorter or absent weight list with the defaults.
console.log(JSON.stringify({ migrated: migrateFSRS6Parameters().length }))

// The decay drives the forgetting curve; factor is derived from it.
const { decay, factor } = computeDecayFactor(FSRS6_DECAY)
console.log(JSON.stringify({ decay, factor: Number(factor.toFixed(6)) }))

const scheduler = defineScheduler({
  model: FSRS6Model,
  chrono: dateChrono,
}).create({
  config: {
    weights: FSRS6_DEFAULT_WEIGHTS,
    enableShortTerm: true,
    numRelearningSteps: 1,
  },
})
const now = new Date('2026-01-01T00:00:00.000Z')
const card = scheduler.newCard({ now })
const result = scheduler.review({ card, grade: Rating.Good, now })
console.log(JSON.stringify({ due: result.card.dueAt.toISOString() }))
