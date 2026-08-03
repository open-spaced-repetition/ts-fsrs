import { once } from 'node:events'
import { createServer } from 'node:http'

const mocks = vi.hoisted(() => ({
  context: {
    destroy: vi.fn(),
    suppressDestroy: vi.fn(),
  },
  createContext: vi.fn(),
  instantiateNapiModule: vi.fn(),
  asyncWorkPlugin: {},
  tsfnPlugin: {},
}))

vi.mock('@emnapi/runtime', () => ({
  createContext: mocks.createContext,
}))

vi.mock('@napi-rs/wasm-runtime', () => ({
  emnapiAsyncWorkPlugin: mocks.asyncWorkPlugin,
  emnapiTSFNPlugin: mocks.tsfnPlugin,
  instantiateNapiModule: mocks.instantiateNapiModule,
  WASI: class {},
}))

let initOptimizer: typeof import('../../binding/js/dynamic-browser.js').initOptimizer
const disposeSymbol = Symbol.for('napi.rs.wasi.dispose')

function createWorker() {
  return {
    addEventListener: vi.fn(),
    terminate: vi.fn(),
  }
}

beforeAll(async () => {
  ;({ initOptimizer } = await import('../../binding/js/dynamic-browser.js'))
})

beforeEach(() => {
  vi.restoreAllMocks()
  mocks.context.destroy.mockReset()
  mocks.context.suppressDestroy.mockReset()
  mocks.createContext.mockReset().mockReturnValue(mocks.context)
  mocks.instantiateNapiModule
    .mockReset()
    .mockImplementation(async (_wasm, options) => {
      options.onCreateWorker()
      options.beforeInit({ instance: { exports: {} } })
      return { napiModule: { exports: {} } }
    })
  vi.stubGlobal(
    'WebAssembly',
    Object.assign(Object.create(WebAssembly), { Memory: vi.fn() })
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

test('initializes BufferSource with the emnapi v2 plugins', async () => {
  const worker = createWorker()
  await initOptimizer({
    wasm: new Uint8Array([0]),
    worker: () => worker,
  })

  expect(mocks.createContext).toHaveBeenCalledWith({ autoDestroy: false })
  expect(mocks.context.suppressDestroy).toHaveBeenCalledOnce()
  expect(mocks.instantiateNapiModule).toHaveBeenCalledWith(
    expect.any(Uint8Array),
    expect.objectContaining({
      asyncWorkPoolSize: 4,
      plugins: [mocks.asyncWorkPlugin, mocks.tsfnPlugin],
    })
  )
})

test('fetches URL inputs and rejects non-2xx responses', async () => {
  const server = createServer((request, response) => {
    if (request.url === '/binding.wasm') {
      response.end(new Uint8Array([0]))
      return
    }
    response.statusCode = 503
    response.statusMessage = 'Unavailable'
    response.end('nope')
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  if (address === null || typeof address === 'string') {
    throw new Error('HTTP test server did not bind to a TCP port')
  }
  const baseUrl = `http://127.0.0.1:${address.port}`

  try {
    await initOptimizer({
      wasm: `${baseUrl}/binding.wasm`,
      worker: createWorker,
    })
    await expect(
      initOptimizer({
        wasm: new URL(`${baseUrl}/unavailable.wasm`),
        worker: createWorker,
      })
    ).rejects.toThrow('503 Unavailable')
  } finally {
    server.close()
    await once(server, 'close')
  }
})

test('supports Response and URL worker inputs', async () => {
  const worker = createWorker()
  const Worker = vi.fn(function Worker() {
    return worker
  })
  vi.stubGlobal('Worker', Worker)

  await initOptimizer({
    wasm: new Response(new Uint8Array([0])),
    worker: new URL('https://example.test/wasi-worker.mjs'),
  })

  expect(Worker).toHaveBeenCalledWith(
    new URL('https://example.test/wasi-worker.mjs'),
    { type: 'module' }
  )
})

test('dispatches worker error events through globalThis', async () => {
  const worker = createWorker()
  const dispatchEvent = vi.fn()
  class CustomEvent {
    constructor(
      readonly type: string,
      readonly init: { detail: unknown }
    ) {}
  }
  vi.stubGlobal('dispatchEvent', dispatchEvent)
  vi.stubGlobal('CustomEvent', CustomEvent)

  await initOptimizer({
    wasm: new Uint8Array([0]),
    worker: () => worker,
    errorEvent: true,
  })
  const listener = worker.addEventListener.mock.calls[0][1]
  listener({ data: { type: 'error', message: 'worker failed' } })

  expect(dispatchEvent).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'napi-rs-worker-error',
      init: { detail: { type: 'error', message: 'worker failed' } },
    })
  )
})

test('rolls back context and worker after initialization fails', async () => {
  const worker = createWorker()
  mocks.instantiateNapiModule.mockImplementationOnce(async (_wasm, options) => {
    options.onCreateWorker()
    throw new Error('initialization failed')
  })

  await expect(
    initOptimizer({
      wasm: new Uint8Array([0]),
      worker: () => worker,
    })
  ).rejects.toThrow('initialization failed')

  expect(mocks.context.destroy).toHaveBeenCalledOnce()
  expect(worker.terminate).toHaveBeenCalledOnce()
})

test('exposes idempotent disposal', async () => {
  const worker = createWorker()
  const binding = await initOptimizer({
    wasm: new Uint8Array([0]),
    worker: () => worker,
  })
  const dispose = Reflect.get(binding, disposeSymbol)

  await Promise.all([dispose(), dispose()])

  expect(mocks.context.destroy).toHaveBeenCalledOnce()
  expect(worker.terminate).toHaveBeenCalledOnce()
})
