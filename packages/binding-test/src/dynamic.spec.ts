import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Worker } from 'node:worker_threads'
import { initOptimizer } from '@open-spaced-repetition/binding/dynamic-wasi'

const require = createRequire(import.meta.url)

const defaultParameters = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666,
  0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658,
  0.1542,
]

/**
 * Resolve wasm and worker paths.
 * In published packages, they live in @open-spaced-repetition/binding-wasm32-wasi.
 * In monorepo dev, they live in the main binding package's dist/.
 */
function resolveWasiAssets():
  | { wasmPath: string; workerPath: string }
  | undefined {
  // Try @open-spaced-repetition/binding-wasm32-wasi first (published)
  try {
    const wasmPath = fileURLToPath(
      import.meta.resolve(
        '@open-spaced-repetition/binding-wasm32-wasi/fsrs-binding.wasm32-wasi.wasm'
      )
    )
    const workerPath = fileURLToPath(
      import.meta.resolve(
        '@open-spaced-repetition/binding-wasm32-wasi/wasi-worker.mjs'
      )
    )
    if (existsSync(wasmPath) && existsSync(workerPath)) {
      return { wasmPath, workerPath }
    }
  } catch (e) {
    console.error('Error resolving wasm32-wasi assets (published):', e)
  }
  // Fallback: monorepo dev — files in main binding dist/
  try {
    const bindingDir = dirname(
      require.resolve('@open-spaced-repetition/binding')
    )
    const wasmPath = join(bindingDir, 'fsrs-binding.wasm32-wasi.wasm')
    const workerPath = join(bindingDir, 'wasi-worker.mjs')
    if (existsSync(wasmPath) && existsSync(workerPath)) {
      return { wasmPath, workerPath }
    }
  } catch (e) {
    console.error('Error resolving wasm32-wasi assets (monorepo dev):', e)
  }
  return undefined
}

const assets = resolveWasiAssets()
const wasmPath = assets?.wasmPath
const workerPath = assets?.workerPath
const hasWasm = assets != null

const describeIfWasm = hasWasm ? describe : describe.skip

describeIfWasm('initOptimizer', () => {
  test('initializes with file path strings', async () => {
    const binding = await initOptimizer({
      wasm: wasmPath!,
      worker: workerPath!,
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
    expect(binding.trainCostAdrExperiment).toBeDefined()
  })

  test('initializes with Buffer wasm', async () => {
    const wasmBuffer = readFileSync(wasmPath!)
    const binding = await initOptimizer({
      wasm: wasmBuffer,
      worker: workerPath!,
    })
    const fsrs = new binding.FSRSBinding()
    expect(fsrs).toBeDefined()
  })

  test('initializes with worker factory', async () => {
    const binding = await initOptimizer({
      wasm: wasmPath!,
      worker: () => new Worker(workerPath!, { env: process.env }),
    })
    expect(binding.FSRSBinding).toBeDefined()
  })

  test('nextStates works after init', async () => {
    const binding = await initOptimizer({
      wasm: wasmPath!,
      worker: workerPath!,
    })
    const fsrs = new binding.FSRSBinding()
    const nextStates = fsrs.nextStates(null, 0.9, 0)
    expect(nextStates.again).toBeDefined()
    expect(nextStates.hard).toBeDefined()
    expect(nextStates.good).toBeDefined()
    expect(nextStates.easy).toBeDefined()
  })

  test('memoryStateFromSM2 works after init', async () => {
    const binding = await initOptimizer({
      wasm: wasmPath!,
      worker: workerPath!,
    })
    const fsrs = new binding.FSRSBinding()
    expect(typeof fsrs.memoryStateFromSM2).toBe('function')
    const m = fsrs.memoryStateFromSM2(2.5, 10, 0.9)
    expect(m.stability).toBeCloseTo(10.0, 3)
    expect(m.difficulty).toBeCloseTo(6.9140563, 3)
  })

  test('computeParameters works after init', async () => {
    const binding = await initOptimizer({
      wasm: wasmPath!,
      worker: workerPath!,
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

  test('trainCostAdrExperiment works after init', async () => {
    const binding = await initOptimizer({
      wasm: wasmPath!,
      worker: workerPath!,
    })
    const result = await binding.trainCostAdrExperiment({
      simulatorConfig: {
        deckSize: 20,
        learnSpan: 30,
        learnLimit: 2,
        reviewLimit: 20,
      },
      parameters: defaultParameters,
      populationSize: 2,
      generations: 1,
      seed: 7,
      simulationSeed: 11,
      costWeights: [0, 4],
      baselineDesiredRetentions: [0.8, 0.9],
    })
    expect(result.policy.coefficients).toHaveLength(15)
    expect(result.policy.coefficients.every(Number.isFinite)).toBe(true)
    expect(result.history).toHaveLength(1)
    expect(result.bestHypervolumeDelta).toBeCloseTo(
      result.bestHypervolume - result.baselineHypervolume
    )
  })

  test('initializes with URL objects', async () => {
    const binding = await initOptimizer({
      wasm: pathToFileURL(wasmPath!),
      worker: pathToFileURL(workerPath!),
    })
    expect(binding.FSRSBinding).toBeDefined()
  })

  test('initializes with file:// URL strings', async () => {
    const binding = await initOptimizer({
      wasm: pathToFileURL(wasmPath!).href,
      worker: pathToFileURL(workerPath!).href,
    })
    expect(binding.FSRSBinding).toBeDefined()
  })

  test('throws on invalid wasm input', async () => {
    await expect(
      // biome-ignore lint/suspicious/noExplicitAny: test
      initOptimizer({ wasm: 123 as any, worker: workerPath! })
    ).rejects.toThrow(TypeError)
  })
})
