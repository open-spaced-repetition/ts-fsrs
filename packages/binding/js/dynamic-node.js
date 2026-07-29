/* eslint-disable */
/* prettier-ignore */

// Derived from the @napi-rs/cli 3.8.0 threaded WASI loader.

import * as nodeFs from 'node:fs'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WASI as NodeWASI } from 'node:wasi'
import { Worker } from 'node:worker_threads'
import { createContext } from '@emnapi/runtime'
import {
  createOnMessage as createOnMessageForFsProxy,
  emnapiAsyncWorkPlugin,
  emnapiTSFNPlugin,
  instantiateNapiModuleSync,
} from '@napi-rs/wasm-runtime'

const WASI_DISPOSE_SYMBOL = Symbol.for('napi.rs.wasi.dispose')

async function resolveWasm(wasm) {
  if (wasm instanceof ArrayBuffer || ArrayBuffer.isView(wasm)) {
    return wasm
  }
  if (typeof Response !== 'undefined' && wasm instanceof Response) {
    if (!wasm.ok) {
      throw new Error(
        `Failed to fetch WASI module: ${wasm.status} ${wasm.statusText || 'Unknown Status'}`
      )
    }
    return wasm.arrayBuffer()
  }
  if (typeof wasm === 'string' || wasm instanceof URL) {
    const value = wasm instanceof URL ? wasm : String(wasm)
    const path =
      value instanceof URL || value.startsWith('file:')
        ? fileURLToPath(value)
        : value
    return readFileSync(path)
  }
  throw new TypeError(
    'options.wasm must be a BufferSource, file path string, file URL, or fetch Response'
  )
}

function getWorkerExecArgv() {
  const execArgv = []
  for (let index = 0; index < process.execArgv.length; index += 1) {
    const argument = process.execArgv[index]
    if (
      argument === '--input-type' ||
      argument === '--eval' ||
      argument === '-e' ||
      argument === '--print' ||
      argument === '-p'
    ) {
      index += 1
      continue
    }
    if (
      argument.startsWith('--input-type=') ||
      argument.startsWith('--eval=') ||
      argument.startsWith('--print=')
    ) {
      continue
    }
    execArgv.push(argument)
  }
  return execArgv
}

function isInvalidWorkerExecArgv(errorMessage, argument) {
  const equalsIndex = argument.indexOf('=')
  const argumentName =
    equalsIndex === -1 ? argument : argument.slice(0, equalsIndex)
  return (
    errorMessage.includes(`: ${argumentName},`) ||
    errorMessage.includes(`: ${argumentName}=`) ||
    errorMessage.endsWith(`: ${argumentName}`) ||
    errorMessage.includes(`, ${argumentName},`) ||
    errorMessage.includes(`, ${argumentName}=`) ||
    errorMessage.endsWith(`, ${argumentName}`)
  )
}

function removeInvalidWorkerExecArgv(execArgv, error) {
  if (typeof error.message !== 'string') {
    return
  }
  const nextExecArgv = []
  let removed = false
  for (let index = 0; index < execArgv.length; index += 1) {
    const argument = execArgv[index]
    if (
      argument.startsWith('-') &&
      isInvalidWorkerExecArgv(error.message, argument)
    ) {
      removed = true
      if (
        !argument.includes('=') &&
        index + 1 < execArgv.length &&
        !execArgv[index + 1].startsWith('-')
      ) {
        index += 1
      }
      continue
    }
    nextExecArgv.push(argument)
  }
  return removed ? nextExecArgv : undefined
}

function createWorker(filename) {
  let execArgv = getWorkerExecArgv()
  while (true) {
    try {
      return new Worker(filename, { env: process.env, execArgv })
    } catch (error) {
      if (!error || error.code !== 'ERR_WORKER_INVALID_EXEC_ARGV') {
        throw error
      }
      const nextExecArgv = removeInvalidWorkerExecArgv(execArgv, error)
      if (!nextExecArgv) {
        throw error
      }
      execArgv = nextExecArgv
    }
  }
}

function resolveWorker(worker) {
  if (typeof worker === 'function') {
    return worker
  }
  if (typeof worker === 'string' || worker instanceof URL) {
    const target =
      typeof worker === 'string' && worker.startsWith('file:')
        ? new URL(worker)
        : worker
    return () => createWorker(target)
  }
  throw new TypeError(
    'options.worker must be a factory function, file path string, or file URL'
  )
}

function unrefWorker(worker) {
  const publicPort = Object.getOwnPropertySymbols(worker).find((symbol) =>
    symbol.toString().includes('kPublicPort')
  )
  if (publicPort) {
    worker[publicPort].ref = () => {}
  }
  const handle = Object.getOwnPropertySymbols(worker).find((symbol) =>
    symbol.toString().includes('kHandle')
  )
  if (handle) {
    worker[handle].ref = () => {}
  }
  worker.unref()
}

function createCleanupError(errors, message) {
  return errors.length === 1 ? errors[0] : new AggregateError(errors, message)
}

function attachCleanupError(error, cleanupError) {
  try {
    if (
      error &&
      (typeof error === 'object' || typeof error === 'function') &&
      error.cause === undefined
    ) {
      error.cause = cleanupError
      return error
    }
  } catch {}
  return new AggregateError(
    [error, cleanupError],
    'WASI binding initialization and cleanup failed'
  )
}

function captureAutoDestroyListener() {
  let listener
  const capture = (event, candidate) => {
    if (event === 'beforeExit' && listener === undefined) {
      listener = candidate
    }
  }
  process.prependListener('newListener', capture)
  return () => {
    process.removeListener('newListener', capture)
    if (listener !== undefined) {
      process.removeListener('beforeExit', listener)
    }
  }
}

export async function initOptimizer(options) {
  const wasm = await resolveWasm(options.wasm)
  const workerFactory = resolveWorker(options.worker)
  const workers = new Set()
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'fsrs-'))
  const wasi = new NodeWASI({
    version: 'preview1',
    env: process.env,
    preopens: { '/tmp': temporaryDirectory },
  })
  const memory = new WebAssembly.Memory({
    initial: 4000,
    maximum: 65536,
    shared: true,
  })
  let context
  let instance
  let contextDestroyed = false
  let cleanupPrepared = false
  let disposed = false
  let disposePromise
  let exitListenerRegistered = false

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
    const errors = []
    await Promise.all(
      [...workers].map(async (worker) => {
        try {
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

  function removeExitListener() {
    if (exitListenerRegistered) {
      process.removeListener('exit', disposeAtExit)
      exitListenerRegistered = false
    }
  }

  async function cleanup() {
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
    try {
      rmSync(temporaryDirectory, { recursive: true, force: true })
    } catch (error) {
      errors.push(error)
    }
    removeExitListener()
    if (errors.length > 0) {
      throw createCleanupError(errors, 'WASI binding cleanup failed')
    }
  }

  function disposeAtExit() {
    exitListenerRegistered = false
    void dispose().catch(() => {})
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
    const finishAutoDestroyCapture = captureAutoDestroyListener()
    try {
      context = createContext({ autoDestroy: false })
      context.suppressDestroy()
    } finally {
      finishAutoDestroyCapture()
    }

    const asyncWorkPoolSize = (() => {
      const configured = Number(
        process.env.NAPI_RS_ASYNC_WORK_POOL_SIZE ??
          process.env.UV_THREADPOOL_SIZE
      )
      return configured > 0 ? configured : 4
    })()

    const { napiModule } = instantiateNapiModuleSync(wasm, {
      context,
      asyncWorkPoolSize,
      reuseWorker: true,
      plugins: [emnapiAsyncWorkPlugin, emnapiTSFNPlugin],
      wasi,
      onCreateWorker() {
        const worker = workerFactory()
        workers.add(worker)
        try {
          worker.onmessage = ({ data }) => {
            createOnMessageForFsProxy(nodeFs)(data)
          }
          unrefWorker(worker)
          return worker
        } catch (error) {
          void worker.terminate()
          workers.delete(worker)
          throw error
        }
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
            initializedInstance.exports[name]()
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
    process.once('exit', disposeAtExit)
    exitListenerRegistered = true
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
