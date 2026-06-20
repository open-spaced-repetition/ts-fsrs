import { defineModel } from '@open-spaced-repetition/srs-kit'
import type {
  IModel,
  ModelDefinition,
  ModelForwardInput,
  ModelStepInput,
} from '@open-spaced-repetition/srs-kit/model'
import * as z from 'zod/mini'
import type { FSRSState } from '../../models.js'
import { FSRS5Algorithm } from './algorithm.js'
import { FSRS5_MODEL_BOUNDS } from './constants.js'

const fsrs5ConfigSchema = z.object({
  weights: z.array(z.number()),
  enableShortTerm: z.boolean(),
})

const fsrs5MemoryStateSchema = z.object({
  stability: z.number(),
  difficulty: z.number(),
})

export type FSRS5Config = z.output<typeof fsrs5ConfigSchema>

type FSRS5ModelCreate = (context: {
  readonly config: FSRS5Config
}) => IModel<FSRSState>

const createFSRS5Model = (config: FSRS5Config): IModel<FSRSState> => {
  const bounds = FSRS5_MODEL_BOUNDS

  const modelConfig: FSRS5Config = Object.freeze(config)

  const algo = new FSRS5Algorithm(
    modelConfig.weights,
    modelConfig.enableShortTerm,
    FSRS5_MODEL_BOUNDS
  )

  const step = ({
    memoryState,
    rating,
    elapsedDays,
    retrievability,
  }: ModelStepInput<FSRSState>): FSRSState => {
    return algo.next_state(memoryState, elapsedDays, rating, retrievability)
  }

  const nextInterval = (
    memoryState: FSRSState,
    desiredRetention: number
  ): number => {
    return algo.next_interval(memoryState.stability, desiredRetention)
  }

  const forgettingCurve = (
    memoryState: FSRSState,
    elapsedDays: number
  ): number => {
    return algo.forgetting_curve(elapsedDays, memoryState.stability)
  }

  const forward = ({
    history,
    initialState,
  }: ModelForwardInput<FSRSState>): FSRSState[] => {
    const states: FSRSState[] = []
    let memoryState = initialState || null
    for (const review of history) {
      memoryState = step({
        memoryState,
        rating: review.rating,
        elapsedDays: review.deltaT,
      })
      states.push(memoryState)
    }
    return states
  }

  return {
    bounds,
    step,
    nextInterval,
    forgettingCurve,
    forward,
  }
}

export const FSRS5Model: ModelDefinition<
  typeof fsrs5ConfigSchema,
  typeof fsrs5MemoryStateSchema,
  FSRS5ModelCreate
> = defineModel({
  name: 'fsrs-5',
  schema: {
    config: fsrs5ConfigSchema,
    memoryState: {
      schema: fsrs5MemoryStateSchema,
      default() {
        return { stability: 0, difficulty: 0 }
      },
    },
  },
  create({ config }) {
    const result = fsrs5ConfigSchema.safeParse(config)
    if (!result.success) {
      throw result.error
    }

    return createFSRS5Model(config)
  },
})
