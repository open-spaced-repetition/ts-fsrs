import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Worker } from 'node:worker_threads'
import { initOptimizer } from '@open-spaced-repetition/binding/dynamic'

const wasmPath = fileURLToPath(
  import.meta.resolve('@open-spaced-repetition/binding/wasm')
)
const workerPath = fileURLToPath(
  import.meta.resolve('@open-spaced-repetition/binding/wasi-worker')
)
const hasWasm = existsSync(wasmPath) && existsSync(workerPath)

const describeIfWasm = hasWasm ? describe : describe.skip

describeIfWasm('initOptimizer', () => {
  test('initializes with file path strings', async () => {
    const binding = await initOptimizer({
      wasm: wasmPath,
      worker: workerPath,
    })
    expect(binding.FSRSBinding).toBeDefined()
    expect(binding.FSRSBindingItem).toBeDefined()
    expect(binding.FSRSBindingReview).toBeDefined()
    expect(binding.BindingItemState).toBeDefined()
    expect(binding.BindingMemoryState).toBeDefined()
    expect(binding.BindingNextStates).toBeDefined()
    expect(binding.computeParameters).toBeDefined()
    expect(binding.convertCsvToFsrsItems).toBeDefined()
    expect(binding.evaluateWithTimeSeriesSplits).toBeDefined()
  })

  test('initializes with Buffer wasm', async () => {
    const wasmBuffer = readFileSync(wasmPath)
    const binding = await initOptimizer({
      wasm: wasmBuffer,
      worker: workerPath,
    })
    const fsrs = new binding.FSRSBinding()
    expect(fsrs).toBeDefined()
  })

  test('initializes with worker factory', async () => {
    const binding = await initOptimizer({
      wasm: wasmPath,
      worker: () => new Worker(workerPath, { env: process.env }),
    })
    expect(binding.FSRSBinding).toBeDefined()
  })

  test('nextStates works after init', async () => {
    const binding = await initOptimizer({
      wasm: wasmPath,
      worker: workerPath,
    })
    const fsrs = new binding.FSRSBinding()
    const nextStates = fsrs.nextStates(null, 0.9, 0)
    expect(nextStates.again).toBeDefined()
    expect(nextStates.hard).toBeDefined()
    expect(nextStates.good).toBeDefined()
    expect(nextStates.easy).toBeDefined()
  })

  test('computeParameters works after init', async () => {
    const binding = await initOptimizer({
      wasm: wasmPath,
      worker: workerPath,
    })

    const item = new binding.FSRSBindingItem([
      new binding.FSRSBindingReview(3, 0),
      new binding.FSRSBindingReview(4, 1),
    ])
    const parameters = await binding.computeParameters([item], {
      enableShortTerm: true,
    })
    expect(parameters).toBeDefined()
    expect(Array.isArray(parameters)).toBe(true)
    expect(parameters.length).toBe(21)
  })

  test('throws on invalid wasm input', async () => {
    await expect(
      // biome-ignore lint/suspicious/noExplicitAny: test
      initOptimizer({ wasm: 123 as any, worker: workerPath })
    ).rejects.toThrow(TypeError)
  })
})
