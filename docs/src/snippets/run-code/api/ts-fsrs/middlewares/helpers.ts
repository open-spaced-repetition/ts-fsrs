import { State } from 'ts-fsrs'
import {
  calculateLearningSteps,
  calculateScheduleDay,
  DEFAULT_LEECH_THRESHOLD,
  DEFAULT_MAXIMUM_INTERVAL,
  defaultLearningSteps,
  defaultRelearningSteps,
  fnv1aMulberry32Rng,
  leechConfigSchema,
} from 'ts-fsrs/middlewares'

// Defaults the built-in policies fall back to.
console.log(
  JSON.stringify({
    learning: defaultLearningSteps,
    relearning: defaultRelearningSteps,
    maximumInterval: DEFAULT_MAXIMUM_INTERVAL,
    leechThreshold: DEFAULT_LEECH_THRESHOLD,
  })
)

// Picks one interval out of the per-grade candidates, keeping it monotonic.
console.log(
  JSON.stringify({ scheduled: calculateScheduleDay([4, 2, 8, 7], 100) })
)

// The resolver LearningSteps uses to walk a step list.
console.log(
  JSON.stringify({
    resolved: calculateLearningSteps(
      {
        learningSteps: defaultLearningSteps,
        relearningSteps: defaultRelearningSteps,
      },
      State.Learning,
      0
    ),
  })
)

// Deterministic RNG behind fuzzing: a seed returns a generator, and the same
// seed always produces the same sequence.
const next = fnv1aMulberry32Rng('card-1')
const again = fnv1aMulberry32Rng('card-1')
console.log(JSON.stringify({ deterministic: next() === again() }))

// Schemas validate a policy's config without constructing a scheduler.
const parsed = leechConfigSchema['~standard'].validate({ leechThreshold: 8 })
console.log(JSON.stringify({ leech: parsed }))
