import { dateChrono, defineScheduler, Rating } from 'ts-fsrs'
import {
  checkFSRS5Parameters,
  clipFSRS5Parameters,
  FSRS5_DECAY,
  FSRS5_DEFAULT_WEIGHTS,
  FSRS5_FACTOR,
  FSRS5_MODEL_BOUNDS,
  FSRS5Model,
  migrateFSRS5Parameters,
} from 'ts-fsrs/models/fsrs-5'

// Bounds the model clamps weights into.
console.log(JSON.stringify(FSRS5_MODEL_BOUNDS))

// clip pulls out-of-range weights back to the nearest bound; check throws instead.
console.log(JSON.stringify({ w0: clipFSRS5Parameters([-999])[0] }))
console.log(
  JSON.stringify({
    accepted: checkFSRS5Parameters(FSRS5_DEFAULT_WEIGHTS).length,
  })
)

// migrate fills a shorter or absent weight list with the defaults.
console.log(JSON.stringify({ migrated: migrateFSRS5Parameters().length }))

// Curve terms for this version.
console.log(JSON.stringify({ decay: FSRS5_DECAY, factor: FSRS5_FACTOR }))

const scheduler = defineScheduler({
  model: FSRS5Model,
  chrono: dateChrono,
}).create({
  config: { weights: FSRS5_DEFAULT_WEIGHTS, enableShortTerm: true },
})
const now = new Date('2026-01-01T00:00:00.000Z')
const card = scheduler.newCard({ now })
const result = scheduler.review({ card, grade: Rating.Good, now })
console.log(JSON.stringify({ due: result.card.dueAt.toISOString() }))
