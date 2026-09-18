import { dateChrono, defineScheduler, Rating } from 'ts-fsrs'
import {
  checkFSRS3Parameters,
  clipFSRS3Parameters,
  FSRS3_DEFAULT_WEIGHTS,
  FSRS3_MODEL_BOUNDS,
  FSRS3Model,
  FSRS3ParameterBounds,
  migrateFSRS3Parameters,
} from 'ts-fsrs/models/fsrs-3'

// Bounds the model clamps weights into.
console.log(JSON.stringify(FSRS3_MODEL_BOUNDS))

// clip pulls out-of-range weights back to the nearest bound; check throws instead.
console.log(JSON.stringify({ w0: clipFSRS3Parameters([-999])[0] }))
console.log(
  JSON.stringify({
    accepted: checkFSRS3Parameters(FSRS3_DEFAULT_WEIGHTS).length,
  })
)

// migrate fills a shorter or absent weight list with the defaults.
console.log(JSON.stringify({ migrated: migrateFSRS3Parameters().length }))

// The raw [min, max] pairs the clip helper uses.
console.log(JSON.stringify({ bounds: FSRS3ParameterBounds().length }))

const scheduler = defineScheduler({
  model: FSRS3Model,
  chrono: dateChrono,
}).create({
  config: { weights: FSRS3_DEFAULT_WEIGHTS },
})
const now = new Date('2026-01-01T00:00:00.000Z')
const card = scheduler.newCard({ now })
const result = scheduler.review({ card, grade: Rating.Good, now })
console.log(JSON.stringify({ due: result.card.dueAt.toISOString() }))
