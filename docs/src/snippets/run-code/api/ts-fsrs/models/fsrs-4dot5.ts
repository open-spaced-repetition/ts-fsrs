import { dateChrono, defineScheduler, Rating } from 'ts-fsrs'
import {
  checkFSRS4Dot5Parameters,
  clipFSRS4Dot5Parameters,
  FSRS4Dot5_DECAY,
  FSRS4Dot5_DEFAULT_WEIGHTS,
  FSRS4Dot5_FACTOR,
  FSRS4Dot5_MODEL_BOUNDS,
  FSRS4Dot5Model,
  migrateFSRS4Dot5Parameters,
} from 'ts-fsrs/models/fsrs-4dot5'

// Bounds the model clamps weights into.
console.log(JSON.stringify(FSRS4Dot5_MODEL_BOUNDS))

// clip pulls out-of-range weights back to the nearest bound; check throws instead.
const clipped = clipFSRS4Dot5Parameters(
  [...FSRS4Dot5_DEFAULT_WEIGHTS].fill(-999, 0, 1)
)
console.log(JSON.stringify({ w0: clipped[0] }))
console.log(
  JSON.stringify({
    accepted: checkFSRS4Dot5Parameters(FSRS4Dot5_DEFAULT_WEIGHTS).length,
  })
)

// migrate fills a shorter or absent weight list with the defaults.
console.log(JSON.stringify({ migrated: migrateFSRS4Dot5Parameters().length }))

// Curve terms for this version.
console.log(
  JSON.stringify({ decay: FSRS4Dot5_DECAY, factor: FSRS4Dot5_FACTOR })
)

const scheduler = defineScheduler({
  model: FSRS4Dot5Model,
  chrono: dateChrono,
}).create({
  config: { weights: FSRS4Dot5_DEFAULT_WEIGHTS },
})
const now = new Date('2026-01-01T00:00:00.000Z')
const card = scheduler.newCard({ now })
const result = scheduler.review({ card, grade: Rating.Good, now })
console.log(JSON.stringify({ due: result.card.dueAt.toISOString() }))
