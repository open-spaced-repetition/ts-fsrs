/* eslint-disable */
/* prettier-ignore */

// Derived from the @napi-rs/cli 3.8.0 threaded WASI loader.

import { createContext } from '@emnapi/runtime'
import {
  emnapiAsyncWorkPlugin,
  emnapiTSFNPlugin,
  instantiateNapiModule,
  WASI,
} from '@napi-rs/wasm-runtime'

const WASI_DISPOSE_SYMBOL = Symbol.for('napi.rs.wasi.dispose')

/** @param {Response} response @param {string} source */
async function readResponse(response, source) {
  if (!response.ok) {
    throw new Error(
      `Failed to fetch WASI module ${source}: ${response.status} ${response.statusText || 'Unknown Status'}`
    )
  }
  return response.arrayBuffer()
}

/** @param {import('./dynamic.js').InitOptimizerOptions['wasm']} wasm */
async function resolveWasm(wasm) {
  if (wasm instanceof ArrayBuffer || ArrayBuffer.isView(wasm)) {
    return wasm
  }
  if (typeof Response !== 'undefined' && wasm instanceof Response) {
    return readResponse(wasm, wasm.url || '<response>')
  }
  if (typeof wasm === 'string' || wasm instanceof URL) {
    const url = wasm instanceof URL ? wasm.href : wasm
    return readResponse(await globalThis.fetch(url), url)
  }
  throw new TypeError(
    'options.wasm must be a BufferSource, URL string, URL, or fetch Response'
  )
}

/** @param {import('./dynamic.js').InitOptimizerOptions['worker']} worker */
function resolveWorker(worker) {
  if (typeof worker === 'function') {
    return worker
  }
  if (typeof worker === 'string' || worker instanceof URL) {
    return () => new Worker(worker, { type: 'module' })
  }
  throw new TypeError(
    'options.worker must be a factory function, URL string, or URL'
  )
}

/** @param {unknown[]} errors @param {string} message */
function createCleanupError(errors, message) {
  return errors.length === 1 ? errors[0] : new AggregateError(errors, message)
}

/** @param {unknown} error @param {unknown} cleanupError */
function attachCleanupError(error, cleanupError) {
  try {
    if (
      error &&
      (typeof error === 'object' || typeof error === 'function') &&
      Reflect.get(error, 'cause') === undefined
    ) {
      return Object.assign(error, { cause: cleanupError })
    }
  } catch {}
  return new AggregateError(
    [error, cleanupError],
    'WASI binding initialization and cleanup failed'
  )
}

/** @param {import('./dynamic.js').InitOptimizerOptions} options */
export async function initOptimizer(options) {
  const wasm = await resolveWasm(options.wasm)
  const workerFactory = resolveWorker(options.worker)
  /** @type {Set<Worker>} */
  const workers = new Set()
  const wasi = new WASI({ version: 'preview1' })
  const memory = new WebAssembly.Memory({
    initial: 4000,
    maximum: 65536,
    shared: true,
  })
  /** @type {import('@emnapi/runtime').Context | undefined} */
  let context
  /** @type {WebAssembly.Instance | undefined} */
  let instance
  /** @type {import('@emnapi/core').ThreadManager | undefined} */
  let threadManager
  let contextDestroyed = false
  let cleanupPrepared = false
  let disposed = false
  /** @type {Promise<void> | undefined} */
  let disposePromise

  async function destroyContext() {
    if (contextDestroyed || context === undefined) {
      contextDestroyed = true
      return
    }
    if (!cleanupPrepared) {
      const prepare = instance?.exports?.napi_prepare_wasm_env_cleanup
      if (typeof prepare === 'function') {
        prepare()
      }
      cleanupPrepared = true
    }
    await context.destroy()
    contextDestroyed = true
  }

  async function terminateWorkers() {
    /** @type {unknown[]} */
    const errors = []
    await Promise.all(
      [...workers].map(async (worker) => {
        try {
          threadManager?.terminateWorker(worker)
          worker.onmessage = null
          await worker.terminate()
          workers.delete(worker)
        } catch (error) {
          errors.push(error)
        }
      })
    )
    if (errors.length > 0) {
      throw createCleanupError(errors, 'Failed to terminate WASI workers')
    }
  }

  async function cleanup() {
    /** @type {unknown[]} */
    const errors = []
    try {
      await destroyContext()
    } catch (error) {
      errors.push(error)
    }
    try {
      await terminateWorkers()
    } catch (error) {
      errors.push(error)
    }
    if (errors.length > 0) {
      throw createCleanupError(errors, 'WASI binding cleanup failed')
    }
  }

  function dispose() {
    if (disposePromise) {
      return disposePromise
    }
    if (disposed) {
      return Promise.resolve()
    }
    disposePromise = cleanup().then(
      () => {
        disposed = true
      },
      (error) => {
        disposePromise = undefined
        throw error
      }
    )
    return disposePromise
  }

  try {
    context = createContext()
    context.suppressDestroy()
    const { napiModule } = await instantiateNapiModule(wasm, {
      context,
      asyncWorkPoolSize: 4,
      plugins: [
        (runtime) => {
          threadManager = runtime.PThread
          return {}
        },
        emnapiAsyncWorkPlugin,
        emnapiTSFNPlugin,
      ],
      wasi,
      onCreateWorker() {
        const worker = workerFactory()
        workers.add(worker)
        if (options.errorEvent) {
          worker.addEventListener('message', (event) => {
            if (
              event.data &&
              typeof event.data === 'object' &&
              event.data.type === 'error'
            ) {
              const CustomEventConstructor = globalThis.CustomEvent
              if (
                typeof globalThis.dispatchEvent === 'function' &&
                typeof CustomEventConstructor === 'function'
              ) {
                globalThis.dispatchEvent(
                  new CustomEventConstructor('napi-rs-worker-error', {
                    detail: event.data,
                  })
                )
              }
            }
          })
        }
        return worker
      },
      overwriteImports(importObject) {
        importObject.env = {
          ...importObject.env,
          ...importObject.napi,
          ...importObject.emnapi,
          memory,
        }
        return importObject
      },
      beforeInit({ instance: initializedInstance }) {
        instance = initializedInstance
        for (const name of Object.keys(initializedInstance.exports)) {
          if (name.startsWith('__napi_register__')) {
            const register = initializedInstance.exports[name]
            if (typeof register !== 'function') {
              throw new TypeError(`Invalid N-API registration export: ${name}`)
            }
            register()
          }
        }
      },
    })
    Object.defineProperty(napiModule.exports, WASI_DISPOSE_SYMBOL, {
      configurable: false,
      enumerable: false,
      value: dispose,
      writable: false,
    })
    return napiModule.exports
  } catch (error) {
    try {
      await cleanup()
    } catch (cleanupError) {
      throw attachCleanupError(error, cleanupError)
    }
    throw error
  }
}
