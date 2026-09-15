import {
  defineModel,
  type ModelCore,
  type ModelForwardInput,
  type ModelStepInput,
  Rating,
} from 'ts-fsrs'
import { z } from 'zod'

const myConfigSchema = z.object({
  weights: z.array(z.number()).min(1),
})

const myMemoryStateSchema = z.object({
  stability: z.number().positive(),
  difficulty: z.number().min(1).max(10),
})

type MyConfig = z.output<typeof myConfigSchema>
type MyMemoryState = z.output<typeof myMemoryStateSchema>

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)
const round = (value: number) => Math.round(value * 1e8) / 1e8

const migrateConfig = (config: MyConfig): MyConfig => ({
  weights:
    config.weights.length === 1
      ? [config.weights[0], 0.5]
      : Array.from(config.weights),
})

const clipConfig = (config: MyConfig): MyConfig => ({
  weights: config.weights.map((weight) => clamp(weight, 0.1, 2)),
})

const checkConfig = (config: MyConfig) => {
  if (config.weights.length !== 2) {
    throw new Error('Expected two model weights.')
  }
}

const createModelCore = (
  config: MyConfig
): ModelCore<{
  readonly config: MyConfig
  readonly memoryState: MyMemoryState
  readonly algorithm: null
}> => {
  const bounds = { sMin: 0.01, sMax: 36500, dMin: 1, dMax: 10 }

  const forgettingCurve = (memoryState: MyMemoryState, elapsedDays: number) =>
    round(0.9 ** (elapsedDays / memoryState.stability))

  const step = ({
    memoryState,
    rating,
    elapsedDays,
  }: ModelStepInput<MyMemoryState>): MyMemoryState => {
    if (!memoryState) {
      return {
        stability: config.weights[0] * rating,
        difficulty: clamp(7 - rating, bounds.dMin, bounds.dMax),
      }
    }

    const retrievability = forgettingCurve(memoryState, elapsedDays)
    return {
      stability: round(
        memoryState.stability *
          (1 + config.weights[1] * rating * (1 - retrievability))
      ),
      difficulty: clamp(
        memoryState.difficulty + (3 - rating) * 0.2,
        bounds.dMin,
        bounds.dMax
      ),
    }
  }

  const nextInterval = (memoryState: MyMemoryState, desiredRetention: number) =>
    Math.max(
      Math.round(
        (memoryState.stability * Math.log(desiredRetention)) / Math.log(0.9)
      ),
      1
    )

  const forward = ({
    history,
    initialState,
  }: ModelForwardInput<MyMemoryState>) => {
    const states: MyMemoryState[] = []
    let memoryState = initialState ?? null
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
    config,
    bounds,
    algorithm: null,
    step,
    nextInterval,
    forgettingCurve,
    forward,
  }
}

const MyModel = defineModel({
  name: 'my-model',
  schema: {
    config: myConfigSchema,
    memoryState: myMemoryStateSchema,
  },
  defaultValue: {
    memoryState: () => ({ stability: 1, difficulty: 5 }),
  },
  create({
    config,
    migrate = true,
    clip = true,
    check = true,
    bypass = false,
  }) {
    if (bypass) return createModelCore(config)

    let preparedConfig = migrate ? migrateConfig(config) : config
    if (clip) preparedConfig = clipConfig(preparedConfig)
    if (check) checkConfig(preparedConfig)
    return createModelCore(myConfigSchema.parse(preparedConfig))
  },
})

const model = MyModel.create({ config: { weights: [1] } })
const [firstReview, secondReview] = model.forward({
  history: [
    { rating: Rating.Good, deltaT: 0 },
    { rating: Rating.Good, deltaT: 3 },
  ],
})

console.log(
  JSON.stringify(
    {
      config: model.config,
      firstReview,
      secondReview,
      interval: model.nextInterval(secondReview, 0.9),
    },
    null,
    2
  )
)
