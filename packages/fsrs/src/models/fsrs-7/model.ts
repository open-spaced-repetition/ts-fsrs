import { defineModel } from '@open-spaced-repetition/srs-kit'
import type { ModelCore } from '@open-spaced-repetition/srs-kit/model'
import { FSRS7Algorithm } from './algorithm.js'
import { FSRS7_MODEL_BOUNDS } from './constants.js'
import {
  checkFSRS7Parameters,
  clipFSRS7Parameters,
  migrateFSRS7Parameters,
} from './parameters.js'
import {
  type FSRS7Config,
  FSRS7MemoryStateSchema,
  type FSRS7State,
  fsrs7ConfigSchema,
} from './schema.js'

export type FSRS7ModelCore = ModelCore<{
  readonly config: FSRS7Config
  readonly memoryState: FSRS7State
  readonly algorithm: FSRS7Algorithm
}>

function createFSRS7Model(config: FSRS7Config): FSRS7ModelCore {
  const bounds = FSRS7_MODEL_BOUNDS
  const algorithm = new FSRS7Algorithm(config.weights, bounds)
  return {
    config,
    bounds,
    algorithm,
    step: ({ memoryState, elapsedDays, rating, retrievability }) =>
      algorithm.next_state(memoryState, elapsedDays, rating, retrievability),
    nextInterval: (state, desiredRetention) =>
      algorithm.next_interval(state, desiredRetention),
    forgettingCurve: (state, elapsedDays) =>
      algorithm.curve(elapsedDays, state).retrievability,
    forward({ history, initialState }) {
      const states: FSRS7State[] = []
      let state = initialState ?? null
      for (const { rating, deltaT } of history) {
        state = algorithm.next_state(state, deltaT, rating)
        states.push(state)
      }
      return states
    },
  }
}

export const FSRS7Model = defineModel({
  name: 'fsrs-7',
  schema: { config: fsrs7ConfigSchema, memoryState: FSRS7MemoryStateSchema },
  defaultValue: {
    memoryState() {
      return { stability: 0, stabilityFast: 0, difficulty: 0 }
    },
  },
  create({
    config,
    migrate = true,
    clip = true,
    check = true,
    bypass = false,
  }) {
    if (bypass) return createFSRS7Model(config)
    let weights = migrate
      ? migrateFSRS7Parameters(config.weights)
      : config.weights
    if (clip && Array.isArray(weights)) weights = clipFSRS7Parameters(weights)
    if (check) checkFSRS7Parameters(weights)
    return createFSRS7Model(Object.freeze(fsrs7ConfigSchema.parse({ weights })))
  },
})
