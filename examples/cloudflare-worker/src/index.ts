import packageMetadata from '@open-spaced-repetition/binding-wasm32-wasip1/package.json'
import wasmModule from '@open-spaced-repetition/binding-wasm32-wasip1/wasm.wasm'
import {
  instantiate,
  type WasiBinding,
} from '@open-spaced-repetition/binding-wasm32-wasip1/workerd'

let bindingPromise: Promise<WasiBinding> | undefined
let initializationCount = 0
const MAX_CSV_BYTES = 10 * 1024 * 1024

function getBinding(): Promise<WasiBinding> {
  if (!bindingPromise) {
    initializationCount++
    bindingPromise = instantiate(wasmModule).catch((error: unknown) => {
      bindingPromise = undefined
      throw error
    })
  }
  return bindingPromise
}

function badRequest(error: string): Response {
  return Response.json({ ok: false, error }, { status: 400 })
}

async function compute(request: Request, url: URL): Promise<Response> {
  const contentType = request.headers.get('content-type')?.split(';', 1)[0]
  if (
    contentType !== 'text/csv' &&
    contentType !== 'application/octet-stream'
  ) {
    return badRequest('Expected a text/csv or application/octet-stream body')
  }

  const nextDayStartsAt = Number(url.searchParams.get('nextDayStartsAt') ?? 4)
  if (
    !Number.isInteger(nextDayStartsAt) ||
    nextDayStartsAt < 0 ||
    nextDayStartsAt > 23
  ) {
    return badRequest('nextDayStartsAt must be an integer from 0 to 23')
  }

  const timezone = url.searchParams.get('timezone') ?? 'Asia/Shanghai'
  const contentLength = Number(request.headers.get('content-length'))
  if (contentLength > MAX_CSV_BYTES) {
    return badRequest('CSV body exceeds the 10 MiB limit')
  }

  const csv = new Uint8Array(await request.arrayBuffer())
  if (csv.byteLength === 0) {
    return badRequest('CSV body is empty')
  }
  if (csv.byteLength > MAX_CSV_BYTES) {
    return badRequest('CSV body exceeds the 10 MiB limit')
  }

  const binding = await getBinding()
  const parseStartedAt = performance.now()
  let fsrsItems: ReturnType<WasiBinding['convertCsvToFsrsItems']>
  try {
    fsrsItems = binding.convertCsvToFsrsItems(csv, nextDayStartsAt, timezone)
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : String(error))
  }
  const parseMs = performance.now() - parseStartedAt

  const trainingStartedAt = performance.now()
  const parameters = await binding.computeParameters(fsrsItems, {
    enableShortTerm: true,
    numRelearningSteps: 1,
  })
  const trainingMs = performance.now() - trainingStartedAt

  if (parameters.length !== 21 || !parameters.every(Number.isFinite)) {
    throw new Error('FSRS smoke computation returned an invalid result')
  }

  return Response.json({
    ok: true,
    csvBytes: csv.byteLength,
    fsrsItemsCount: fsrsItems.length,
    parseMs,
    trainingMs,
    parameters,
  })
}

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url)

      if (request.method === 'GET' && url.pathname === '/health') {
        await getBinding()
        return Response.json({
          ok: true,
          status: 'ready',
          bindingVersion: packageMetadata.version,
          initializationCount,
        })
      }

      if (request.method === 'POST' && url.pathname === '/compute') {
        return await compute(request, url)
      }

      return new Response('Not Found', { status: 404 })
    } catch (error) {
      return Response.json(
        {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    }
  },
}
