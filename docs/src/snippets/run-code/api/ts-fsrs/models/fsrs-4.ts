import { dateChrono, defineScheduler, Rating } from 'ts-fsrs'
import {
  checkFSRS4Parameters,
  clipFSRS4Parameters,
  FSRS4_DEFAULT_WEIGHTS,
  FSRS4_MODEL_BOUNDS,
  FSRS4Model,
  migrateFSRS4Parameters,
} from 'ts-fsrs/models/fsrs-4'

// Bounds the model clamps weights into.
console.log(JSON.stringify(FSRS4_MODEL_BOUNDS))

// clip pulls out-of-range weights back to the nearest bound; check throws instead.
console.log(JSON.stringify({ w0: clipFSRS4Parameters([-999])[0] }))
console.log(
  JSON.stringify({
    accepted: checkFSRS4Parameters(FSRS4_DEFAULT_WEIGHTS).length,
  })
)

// migrate fills a shorter or absent weight list with the defaults.
console.log(JSON.stringify({ migrated: migrateFSRS4Parameters().length }))

const scheduler = defineScheduler({
  model: FSRS4Model,
  chrono: dateChrono,
}).create({
  config: { weights: FSRS4_DEFAULT_WEIGHTS },
})
const now = new Date('2026-01-01T00:00:00.000Z')
const card = scheduler.newCard({ now })
const result = scheduler.review({ card, grade: Rating.Good, now })
console.log(JSON.stringify({ due: result.card.dueAt.toISOString() }))
