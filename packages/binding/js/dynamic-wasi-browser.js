/* eslint-disable */
/* prettier-ignore */

// Dynamic loader for browser — allows external wasm/worker resources.

import {
  getDefaultContext as __emnapiGetDefaultContext,
  instantiateNapiModuleSync as __emnapiInstantiateNapiModuleSync,
  WASI as __WASI,
} from '@napi-rs/wasm-runtime'

async function _resolveWasm(wasm) {
  if (wasm instanceof ArrayBuffer || ArrayBuffer.isView(wasm)) {
    return wasm
  }
  if (typeof Response !== 'undefined' && wasm instanceof Response) {
    return wasm.arrayBuffer()
  }
  if (typeof wasm === 'string' || wasm instanceof URL) {
    const url = typeof wasm === 'string' ? wasm : wasm.href
    return fetch(url).then((r) => r.arrayBuffer())
  }
  throw new TypeError(
    'options.wasm must be a BufferSource, URL string, URL, or fetch Response'
  )
}

function _resolveWorker(worker, errorEvent) {
  let factory
  if (typeof worker === 'function') {
    factory = worker
  } else if (typeof worker === 'string' || worker instanceof URL) {
    const workerUrl = typeof worker === 'string' ? worker : worker.href
    factory = () => new Worker(workerUrl, { type: 'module' })
  } else {
    throw new TypeError(
      'options.worker must be a factory function, URL string, or URL'
    )
  }
  if (!errorEvent) return factory
  return () => {
    const w = factory()
    w.addEventListener('message', (event) => {
      if (
        event.data &&
        typeof event.data === 'object' &&
        event.data.type === 'error'
      ) {
        window.dispatchEvent(
          new CustomEvent('napi-rs-worker-error', { detail: event.data })
        )
      }
    })
    return w
  }
}

export async function initOptimizer(options) {
  const wasmBinary = await _resolveWasm(options.wasm)
  const onCreateWorker = _resolveWorker(
    options.worker,
    options.errorEvent ?? false
  )

  // --- WASI setup ---
  const __wasi = new __WASI({
    version: 'preview1',
  })

  const __emnapiContext = __emnapiGetDefaultContext()
  const __sharedMemory = new WebAssembly.Memory({
    initial: 4000,
    maximum: 65536,
    shared: true,
  })

  const { napiModule: __napiModule } = __emnapiInstantiateNapiModuleSync(
    wasmBinary,
    {
      context: __emnapiContext,
      asyncWorkPoolSize: 4,
      wasi: __wasi,
      onCreateWorker,
      overwriteImports(importObject) {
        importObject.env = {
          ...importObject.env,
          ...importObject.napi,
          ...importObject.emnapi,
          memory: __sharedMemory,
        }
        return importObject
      },
      beforeInit({ instance }) {
        for (const name of Object.keys(instance.exports)) {
          if (name.startsWith('__napi_register__')) {
            instance.exports[name]()
          }
        }
      },
    }
  )

  return __napiModule.exports
}
