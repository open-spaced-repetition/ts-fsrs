/* eslint-disable */
/* prettier-ignore */

// Dynamic loader for Node.js — allows external wasm/worker resources.

const __nodeFs = require('node:fs')
const __nodeOs = require('node:os')
const __nodePath = require('node:path')
const { WASI: __nodeWASI } = require('node:wasi')
const { Worker } = require('node:worker_threads')

const {
  createOnMessage: __wasmCreateOnMessageForFsProxy,
  getDefaultContext: __emnapiGetDefaultContext,
  instantiateNapiModuleSync: __emnapiInstantiateNapiModuleSync,
} = require('@napi-rs/wasm-runtime')

async function _resolveWasm(wasm) {
  if (wasm instanceof ArrayBuffer || ArrayBuffer.isView(wasm)) {
    return wasm
  }
  if (typeof Response !== 'undefined' && wasm instanceof Response) {
    return wasm.arrayBuffer()
  }
  if (typeof wasm === 'string' || wasm instanceof URL) {
    const raw = wasm instanceof URL ? wasm.href : String(wasm)
    const wasmPath = raw.startsWith('file://')
      ? require('node:url').fileURLToPath(raw)
      : raw
    return __nodeFs.readFileSync(wasmPath)
  }
  throw new TypeError(
    'options.wasm must be a BufferSource, file path string, URL, or fetch Response'
  )
}

function _wrapWorker(w) {
  w.onmessage = ({ data }) => {
    __wasmCreateOnMessageForFsProxy(__nodeFs)(data)
  }
  _unrefWorker(w)
  return w
}

function _resolveWorker(worker) {
  if (typeof worker === 'function') {
    return () => _wrapWorker(worker())
  }
  if (typeof worker === 'string' || worker instanceof URL) {
    const raw = worker instanceof URL ? worker.href : String(worker)
    const workerPath = raw.startsWith('file://')
      ? require('node:url').fileURLToPath(raw)
      : raw
    return () => _wrapWorker(new Worker(workerPath))
  }
  if (worker != null && typeof worker === 'object') {
    return () => _wrapWorker(worker)
  }
  throw new TypeError(
    'options.worker must be a function, Worker instance, file path string, or URL'
  )
}

async function initOptimizer(options) {
  const wasmBinary = await _resolveWasm(options.wasm)
  const onCreateWorker = _resolveWorker(options.worker)

  // --- WASI setup ---
  const __tmpDir = __nodeFs.mkdtempSync(__nodePath.join(__nodeOs.tmpdir(), 'fsrs-'))
  const __wasi = new __nodeWASI({
    version: 'preview1',
    env: {},
    preopens: {
      '/tmp': __tmpDir,
    },
  })

  const __emnapiContext = __emnapiGetDefaultContext()
  const __sharedMemory = new WebAssembly.Memory({
    initial: 4000,
    maximum: 65536,
    shared: true,
  })

  const asyncWorkPoolSize = (() => {
    const threadsSizeFromEnv = Number(
      process.env.NAPI_RS_ASYNC_WORK_POOL_SIZE ?? process.env.UV_THREADPOOL_SIZE
    )
    if (threadsSizeFromEnv > 0) {
      return threadsSizeFromEnv
    }
    return 4
  })()

  const { napiModule: __napiModule } = __emnapiInstantiateNapiModuleSync(
    wasmBinary,
    {
      context: __emnapiContext,
      asyncWorkPoolSize,
      reuseWorker: true,
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

/**
 * Unref a worker so it does not prevent the Node.js process from exiting.
 * @param {Worker} worker
 */
function _unrefWorker(worker) {
  const kPublicPort = Object.getOwnPropertySymbols(worker).find((s) =>
    s.toString().includes('kPublicPort')
  )
  if (kPublicPort) {
    worker[kPublicPort].ref = () => {}
  }

  const kHandle = Object.getOwnPropertySymbols(worker).find((s) =>
    s.toString().includes('kHandle')
  )
  if (kHandle) {
    worker[kHandle].ref = () => {}
  }

  worker.unref()
}

module.exports.initOptimizer = initOptimizer
