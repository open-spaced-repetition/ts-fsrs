import {
  clamp,
  defineModel,
  type ModelForwardInput,
  type ModelStepInput,
  Rating,
} from 'ts-fsrs'
import { z } from 'zod'

const configSchema = z.object({
  weights: z.tuple([
    z.number().min(0.01).max(100),
    z.number().min(0.01).max(100),
    z.number().min(1.3).max(10),
    z.number().nonnegative(),
    z.number().min(5),
    z.number(),
  ]),
})
const memoryStateSchema = z.object({
  interval: z.number().min(0).max(36500),
  easeFactor: z.number().min(1.3).max(10),
  repetitions: z.number().int().nonnegative(),
})
type MemoryState = z.output<typeof memoryStateSchema>

const SM2Model = defineModel({
  name: 'sm2',
  schema: { config: configSchema, memoryState: memoryStateSchema },
  defaultValue: {
    memoryState: ({ config }) => ({
      interval: 0,
      easeFactor: config.weights[2],
      repetitions: 0,
    }),
  },
  create({ config }) {
    const parsed = configSchema.parse(config)
    const w = parsed.weights
    const step = ({ memoryState, rating }: ModelStepInput<MemoryState>) => {
      const previous = memoryState ?? {
        interval: 0,
        easeFactor: parsed.weights[2],
        repetitions: 0,
      }
      // Again / Hard / Good / Easy -> SM-2 quality 2 / 3 / 4 / 5.
      const quality = rating + 1
      const repetitions = rating > Rating.Again ? previous.repetitions + 1 : 1
      const interval = clamp(
        repetitions === 1
          ? w[0]
          : repetitions === 2
            ? w[1]
            : previous.interval * previous.easeFactor,
        0.01,
        36500
      )
      const easeFactor = clamp(
        previous.easeFactor - w[3] * (quality - w[4]) ** 2 + w[5],
        1.3,
        10
      )
      return { interval, easeFactor, repetitions }
    }
    const forward = ({
      history,
      initialState,
    }: ModelForwardInput<MemoryState>) => {
      const states: MemoryState[] = []
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
      config: parsed,
      bounds: {
        iMin: 0.01,
        iMax: 36500,
        eMin: 1.3,
        eMax: 10,
        rMin: 0,
        rMax: Infinity,
      },
      algorithm: null,
      step,
      // Invert the benchmark curve to satisfy the Model interval contract.
      nextInterval: (state: Readonly<MemoryState>, desiredRetention: number) =>
        Math.max(
          1,
          Math.round(
            (state.interval * Math.log(desiredRetention)) / Math.log(0.9)
          )
        ),
      forgettingCurve: (state: Readonly<MemoryState>, elapsedDays: number) =>
        0.9 ** (elapsedDays / state.interval),
      forward,
    }
  },
})

const model = SM2Model.create({
  config: { weights: [1, 6, 2.5, 0.02, 7, 0.18] },
})
const states = model.forward({
  history: [
    { rating: Rating.Good, deltaT: 0 },
    { rating: Rating.Good, deltaT: 1 },
    { rating: Rating.Good, deltaT: 6 },
  ],
})
console.log(JSON.stringify(states, null, 2)) // Intervals: 1, 6, 15 days.
