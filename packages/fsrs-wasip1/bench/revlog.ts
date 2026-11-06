import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { cpus } from 'node:os'
import { performance } from 'node:perf_hooks'
import { setImmediate } from 'node:timers/promises'
import type { FSRSBinding } from '@open-spaced-repetition/binding-wasm32-wasip1'
import { __napiBindingTarget } from '@open-spaced-repetition/binding-wasm32-wasip1'
import { FSRS6Model, FSRS7Model } from '@open-spaced-repetition/fsrs-wasip1'
import type {
  FSRSState,
  Grade,
  ModelForwardInput,
  ModelReview,
  ModelStepInput,
} from 'ts-fsrs'
import { FSRS6_DEFAULT_WEIGHTS, FSRS6Model as TS6 } from 'ts-fsrs/models/fsrs-6'
import { FSRS7_DEFAULT_WEIGHTS, FSRS7Model as TS7 } from 'ts-fsrs/models/fsrs-7'

type State = FSRSState & { stabilityFast?: number }
interface BenchmarkModel {
  step(input: ModelStepInput<State>): State
  forward(input: ModelForwardInput<State>): readonly State[]
  forgettingCurve(state: State, elapsedDays: number): number
}
type WasmModel = BenchmarkModel & { algorithm: FSRSBinding }
interface Dataset {
  name: string
  sha256?: string
  histories: ModelReview[][]
}

assert.equal(__napiBindingTarget, 'wasm32-wasip1')
const config6 = {
  weights: FSRS6_DEFAULT_WEIGHTS,
  enableShortTerm: true,
  numRelearningSteps: 0,
}
const config7 = { weights: FSRS7_DEFAULT_WEIGHTS }
const versions: [string, BenchmarkModel, WasmModel][] = [
  [
    'FSRS-6',
    TS6.create({ config: config6 }),
    FSRS6Model.create({ config: config6 }),
  ],
  [
    'FSRS-7',
    TS7.create({ config: config7 }),
    FSRS7Model.create({ config: config7 }),
  ],
]
const synthetic: ModelReview[][] = Array.from({ length: 2000 }, (_, card) =>
  Array.from({ length: 30 }, (_, i) => ({
    deltaT: i === 0 || i % 7 === 1 ? 0 : 1 + ((card * 7 + i * 13) % 60),
    rating:
      (card + i * 17) % 10 === 0
        ? 1
        : (card + i) % 7 === 0
          ? 2
          : (card + i) % 11 === 0
            ? 4
            : 3,
  }))
)
const datasets: Dataset[] = [
  { name: 'synthetic-2000x30', histories: synthetic },
]
const csvPath =
  process.argv[2] ??
  new URL('../../../docs/src/public/revlog.csv', import.meta.url)
if (existsSync(csvPath)) {
  const bytes = readFileSync(csvPath)
  // This fixture has no quoted fields. Group before timing, just like prepared revlogs.
  const rows = bytes
    .toString()
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const [time, cid, rating] = line.split(',')
      return { time: Number(time), cid, rating: Number(rating) }
    })
    .sort((a, b) => a.time - b.time)
  const cards = new Map<
    string,
    { lastDay: number | null; history: ModelReview[] }
  >()
  for (const row of rows) {
    assert(
      Number.isFinite(row.time) &&
        Number.isInteger(row.rating) &&
        row.rating >= 1 &&
        row.rating <= 4
    )
    const card = cards.get(row.cid) ?? { lastDay: null, history: [] }
    // Explicit UTC day boundaries; not an Anki timezone/rollover conversion benchmark.
    const day = Math.floor(row.time / 86400000)
    card.history.push({
      deltaT: card.lastDay === null ? 0 : day - card.lastDay,
      rating: row.rating as Grade,
    })
    card.lastDay = day
    cards.set(row.cid, card)
  }
  datasets.push({
    name: 'public-revlog-utc-days',
    sha256: createHash('sha256').update(bytes).digest('hex'),
    histories: [...cards.values()].map((card) => card.history),
  })
} else {
  console.error(
    'Public fixture absent; run node docs/scripts/fetch-revlog.mjs from the repository root, or pass a CSV path.'
  )
}

function checksum(states: readonly State[]) {
  let sum = 0
  for (const s of states)
    sum += s.stability + s.difficulty + (s.stabilityFast ?? 0)
  return sum
}
function loop(
  model: BenchmarkModel,
  histories: ModelReview[][],
  curves = false
) {
  let sum = 0
  for (const history of histories) {
    let state: State | null = null
    for (const review of history) {
      if (curves && state) sum += model.forgettingCurve(state, review.deltaT)
      state = model.step({
        memoryState: state,
        elapsedDays: review.deltaT,
        rating: review.rating,
      })
      sum += state.stability + state.difficulty + (state.stabilityFast ?? 0)
    }
  }
  return sum
}
function replay(model: BenchmarkModel, histories: ModelReview[][]) {
  let sum = 0
  for (const history of histories) sum += checksum(model.forward({ history }))
  return sum
}
function pack(histories: ModelReview[][]) {
  const count = histories.reduce((n, h) => n + h.length, 0)
  const input = new Float64Array(count * 2)
  const offsets = new Uint32Array(histories.length + 1)
  let index = 0
  for (let card = 0; card < histories.length; card++) {
    for (const review of histories[card]) {
      input[index * 2] = review.deltaT
      input[index * 2 + 1] = review.rating
      index++
    }
    offsets[card + 1] = index
  }
  return { input, offsets }
}
function unpack(
  output: Float64Array,
  offsets: Uint32Array,
  version: string,
  stride = 3
): State[][] {
  const cards: State[][] = []
  for (let card = 0; card < offsets.length - 1; card++) {
    const states: State[] = []
    for (
      let i = offsets[card] * stride;
      i < offsets[card + 1] * stride;
      i += stride
    ) {
      states.push(
        version === 'FSRS-6'
          ? { stability: output[i], difficulty: output[i + 1] }
          : {
              stability: output[i],
              difficulty: output[i + 1],
              stabilityFast: output[i + 2],
            }
      )
    }
    cards.push(states)
  }
  return cards
}

const results = []
for (const dataset of datasets) {
  for (const [version, ts, wasm] of versions) {
    let maxScaledError = 0
    let fieldsOutsideTolerance = 0
    let worst: object | undefined
    for (const history of dataset.histories) {
      const expected = ts.forward({ history })
      const actual = wasm.forward({ history })
      assert.equal(actual.length, expected.length)
      for (let i = 0; i < expected.length; i++) {
        for (const key of Object.keys(expected[i]) as (keyof State)[]) {
          const error =
            Math.abs((actual[i][key] ?? 0) - (expected[i][key] ?? 0)) /
            Math.max(1, Math.abs(expected[i][key] ?? 0))
          assert(Number.isFinite(error))
          if (error > 0.0001) fieldsOutsideTolerance++
          if (error > maxScaledError) {
            maxScaledError = error
            worst = {
              reviews: history.length,
              index: i,
              key,
              ts: expected[i],
              wasm: actual[i],
            }
          }
        }
      }
    }
    console.error(
      `${dataset.name} / ${version} numeric check: ${JSON.stringify({ maxScaledError, fieldsOutsideTolerance, worst })}`
    )
    const packed = pack(dataset.histories)
    const cases: [string, () => number][] = [
      ['ts-step+curve', () => loop(ts, dataset.histories, true)],
      ['wasi-step+curve', () => loop(wasm, dataset.histories, true)],
      ['ts-forward', () => replay(ts, dataset.histories)],
      ['wasi-forward', () => replay(wasm, dataset.histories)],
      [
        'wasi-batch-packed',
        () => {
          const output = wasm.algorithm.forwardBatch(
            packed.input,
            packed.offsets
          )
          let sum = 0
          for (let i = 0; i < output.length; i++) sum += output[i]
          return sum
        },
      ],
      [
        'wasi-batch-objects',
        () => {
          const { input, offsets } = pack(dataset.histories)
          const output = wasm.algorithm.forwardBatch(input, offsets)
          return unpack(output, offsets, version).reduce(
            (sum, states) => sum + checksum(states),
            0
          )
        },
      ],
      [
        'wasi-batch+curve-objects',
        () => {
          const { input, offsets } = pack(dataset.histories)
          const output = wasm.algorithm.forwardBatch(input, offsets, true)
          let sum = unpack(output, offsets, version, 4).reduce(
            (sum, states) => sum + checksum(states),
            0
          )
          for (let i = 3; i < output.length; i += 4) sum += output[i]
          return sum
        },
      ],
    ]
    const timings: number[][] = cases.map(() => [])
    // Rotate execution order; yield between runs so WASM wrappers can be finalized.
    for (let round = -2; round < 7; round++) {
      for (let offset = 0; offset < cases.length; offset++) {
        const index = (offset + round + cases.length) % cases.length
        await setImmediate()
        globalThis.gc?.()
        const start = performance.now()
        const sum = cases[index][1]()
        const elapsed = performance.now() - start
        assert(Number.isFinite(sum) && sum > 0)
        if (round >= 0) timings[index].push(elapsed)
      }
    }
    const measurements = Object.fromEntries(
      cases.map(([name], i) => {
        const sorted = timings[i].toSorted((a, b) => a - b)
        return [
          name,
          {
            medianMs: +sorted[3].toFixed(3),
            minMs: +sorted[0].toFixed(3),
            maxMs: +sorted[6].toFixed(3),
          },
        ]
      })
    )
    const result = {
      dataset: dataset.name,
      sha256: dataset.sha256,
      version,
      cards: dataset.histories.length,
      reviews: dataset.histories.reduce((n, h) => n + h.length, 0),
      maxScaledError,
      fieldsOutsideTolerance,
      worst,
      measurements,
    }
    results.push(result)
    console.error(
      `${dataset.name} / ${version}: ${JSON.stringify(measurements)}`
    )
  }
}
console.log(
  JSON.stringify(
    {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      cpu: cpus()[0].model,
      target: __napiBindingTarget,
      warmups: 2,
      samples: 7,
      results,
    },
    null,
    2
  )
)
