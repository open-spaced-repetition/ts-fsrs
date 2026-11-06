import { FSRSBinding } from '@open-spaced-repetition/binding-wasm32-wasip1'
import {
  defineModel,
  FSRSMemoryStateSchema,
  type FSRSState,
  type Model,
  type ModelBounds,
  type ModelCore,
  type ModelForwardInput,
} from 'ts-fsrs'
import {
  checkFSRS6Parameters,
  clipFSRS6Parameters,
  FSRS6_MODEL_BOUNDS,
  fsrs6ConfigSchema,
  migrateFSRS6Parameters,
} from 'ts-fsrs/models/fsrs-6'
import {
  checkFSRS7Parameters,
  clipFSRS7Parameters,
  FSRS7_MODEL_BOUNDS,
  FSRS7MemoryStateSchema,
  type FSRS7State,
  fsrs7ConfigSchema,
  migrateFSRS7Parameters,
} from 'ts-fsrs/models/fsrs-7'

export type { FSRS6Config } from 'ts-fsrs/models/fsrs-6'
export type { FSRS7Config, FSRS7State } from 'ts-fsrs/models/fsrs-7'

type State = FSRSState & { stabilityFast?: number }

function createCore<
  C extends { readonly weights: readonly number[] },
  S extends State,
>(
  config: C,
  bounds: ModelBounds<S>
): ModelCore<{
  config: C
  memoryState: S
  algorithm: FSRSBinding
  forwardResult: Float64Array
}> {
  const binding = new FSRSBinding(Array.from(config.weights))
  const forward = ({
    history,
    initialState,
  }: ModelForwardInput<S>): Float64Array => {
    const input = new Float64Array(history.length * 2)
    for (let i = 0; i < history.length; i++) {
      input[i * 2] = history[i].deltaT
      input[i * 2 + 1] = history[i].rating
    }
    return binding.forward(input, initialState)
  }
  const forgettingCurve = (state: Readonly<S>, elapsedDays: number): number =>
    binding.currentRetrievability(state, elapsedDays)
  return {
    config,
    bounds,
    algorithm: binding,
    nextInterval: (state, desiredRetention) =>
      binding.nextInterval(state, desiredRetention),
    forgettingCurve,
    // fsrs-rs computes retrievability internally; the optional cached hint is unused.
    step: ({ memoryState, elapsedDays, rating }) =>
      binding.step(memoryState, elapsedDays, rating) as S,
    forward,
  }
}

export const FSRS6Model: Model<{
  name: 'fsrs-6'
  config: typeof fsrs6ConfigSchema
  memoryState: typeof FSRSMemoryStateSchema
  algorithm: FSRSBinding
  forwardResult: Float64Array
}> = defineModel({
  name: 'fsrs-6',
  schema: { config: fsrs6ConfigSchema, memoryState: FSRSMemoryStateSchema },
  defaultValue: { memoryState: () => ({ stability: 0, difficulty: 0 }) },
  create({
    config,
    migrate = true,
    clip = true,
    check = true,
    bypass = false,
  }) {
    if (!config.enableShortTerm)
      throw new RangeError('FSRS-6 WASIP1 requires enableShortTerm: true')
    if (!bypass) {
      let weights = migrate
        ? migrateFSRS6Parameters(config.weights)
        : config.weights
      if (clip)
        weights = clipFSRS6Parameters(weights, config.numRelearningSteps, true)
      if (check) checkFSRS6Parameters(weights, config.numRelearningSteps, true)
      config = Object.freeze(fsrs6ConfigSchema.parse({ ...config, weights }))
    }
    return createCore<typeof config, FSRSState>(config, {
      ...FSRS6_MODEL_BOUNDS,
      sMin: 0.0001,
    })
  },
})

export const FSRS7Model: Model<{
  name: 'fsrs-7'
  config: typeof fsrs7ConfigSchema
  memoryState: typeof FSRS7MemoryStateSchema
  algorithm: FSRSBinding
  forwardResult: Float64Array
}> = defineModel({
  name: 'fsrs-7',
  schema: { config: fsrs7ConfigSchema, memoryState: FSRS7MemoryStateSchema },
  defaultValue: {
    memoryState: () => ({ stability: 0, difficulty: 0, stabilityFast: 0 }),
  },
  create({
    config,
    migrate = true,
    clip = true,
    check = true,
    bypass = false,
  }) {
    if (!bypass) {
      let weights = migrate
        ? migrateFSRS7Parameters(config.weights)
        : config.weights
      if (clip) weights = clipFSRS7Parameters(weights)
      if (check) checkFSRS7Parameters(weights)
      config = Object.freeze(fsrs7ConfigSchema.parse({ weights }))
    }
    return createCore<typeof config, FSRS7State>(config, FSRS7_MODEL_BOUNDS)
  },
})
