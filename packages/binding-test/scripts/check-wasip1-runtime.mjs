import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
// Direct flavor entry: never allow a native or threaded fallback in this check.
const dir = process.argv[2]
const entry = process.argv[3]
assert(Reflect.deleteProperty(globalThis, 'SharedArrayBuffer'))
assert(
  Reflect.set(
    globalThis,
    'Worker',
    class {
      constructor() {
        throw new Error('WASI worker forbidden')
      }
    }
  )
)
WebAssembly.Memory = new Proxy(WebAssembly.Memory, {
  construct(target, [options]) {
    assert.notEqual(options.shared, true, 'Shared memory is forbidden')
    return new target(options)
  },
})
const csv = readFileSync(new URL('../src/revlog.csv', import.meta.url))
const loader =
  entry === 'cjs'
    ? null
    : await import(pathToFileURL(`${dir}/fsrs-binding.wasip1-deferred.js`).href)
const wasm = new WebAssembly.Module(
  readFileSync(`${dir}/fsrs-binding.wasm32-wasip1.wasm`)
)
assert(
  !WebAssembly.Module.imports(wasm).some(
    ({ name }) =>
      name.startsWith('pthread_') ||
      name === 'thread-spawn' ||
      name === '__wasi_init_tp'
  )
)
const req = createRequire(import.meta.url)
for (let cycle = 0; cycle < 2; cycle++) {
  const listeners = process.listenerCount('beforeExit')
  const exitListeners = process.listenerCount('exit')
  const instance = loader ? await loader.createInstance(wasm) : null
  const binding = instance?.exports ?? req(`${dir}/fsrs-binding.wasip1.cjs`)
  assert.equal(binding.__napiBindingTarget, 'wasm32-wasip1')
  for (const modelVersion of ['FSRS-6', 'FSRS-7']) {
    const { items, cardIds } = binding.convertCsvToFsrsItemsWithCardIds(
      csv,
      4,
      'Asia/Shanghai',
      modelVersion
    )
    assert.equal(items.length, cardIds.length)
    assert(items.length > 1000)
    /** @type {Array<[number, number]>} */
    const updates = []
    const options = {
      enableShortTerm: true,
      modelVersion,
      cardIds,
      trainingConfig: {
        numEpochs: 2,
        batchSize: 512,
        seed: 2023,
        maxSeqLen: 256,
        learningRate: 0.04,
        gamma: 1,
      },
      /** @param {number} c @param {number} t */
      progress: (c, t) => {
        updates.push([c, t])
      },
    }
    const parameters = await binding.computeParameters(items, options)
    assert.equal(parameters.length, modelVersion === 'FSRS-6' ? 21 : 34)
    assert(parameters.every(Number.isFinite))
    assert(updates.length > 1)
    assert(updates.some(([c, t]) => c > 0 && c < t))
    const finalUpdate = updates.at(-1)
    assert(finalUpdate)
    assert.equal(finalUpdate[0], finalUpdate[1])
    const completedUpdates = updates.length
    await new Promise((resolve) => setTimeout(resolve, 20))
    assert.equal(
      updates.length,
      completedUpdates,
      'Progress arrived after completion'
    )
    await assert.rejects(
      async () =>
        binding.computeParameters(items, { ...options, progress: () => false }),
      /compute_parameters failed/
    )
    console.log(
      JSON.stringify({
        entry,
        cycle,
        modelVersion,
        items: items.length,
        updates: updates.length,
        final: finalUpdate,
        parameters: parameters.length,
      })
    )
  }
  const dispose = instance
    ? () => instance.dispose()
    : binding[Symbol.for('napi.rs.wasi.dispose')]
  assert.equal(typeof dispose, 'function')
  await Promise.all([dispose(), dispose()])
  if (loader) {
    assert.equal(instance.memoryBytes, 0)
    assert.equal(loader.getDeferredRuntimeStats().liveInstances, 0)
    assert.equal(process.listenerCount('beforeExit'), listeners)
    await assert.rejects(
      loader.createInstance(
        new WebAssembly.Module(Uint8Array.of(0, 97, 115, 109, 1, 0, 0, 0))
      )
    )
    assert.equal(process.listenerCount('beforeExit'), listeners)
  } else delete req.cache[req.resolve(`${dir}/fsrs-binding.wasip1.cjs`)]
  assert.equal(process.listenerCount('beforeExit'), listeners)
  assert.equal(process.listenerCount('exit'), exitListeners)
}
