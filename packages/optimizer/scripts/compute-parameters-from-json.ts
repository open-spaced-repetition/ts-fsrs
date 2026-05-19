import fs from 'node:fs/promises'
import process from 'node:process'
import {
  benchmarkParameters,
  type ComputeParametersOptions,
  computeParameters,
  type FSRSItemLike,
  normalizeItems,
} from '../src/index.ts'

type InputPayload = {
  items: readonly FSRSItemLike[]
  mode?: 'benchmark' | 'compute'
  options?: ComputeParametersOptions
}

async function readInput(path: string | undefined): Promise<InputPayload> {
  if (path) {
    return JSON.parse(await fs.readFile(path, 'utf8')) as InputPayload
  }

  const chunks: Uint8Array[] = []
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  if (chunks.length === 0) {
    throw new Error('Missing JSON input')
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as InputPayload
}

async function main(): Promise<void> {
  const path = process.argv[2]
  const payload = await readInput(path)
  const items = normalizeItems(payload.items)
  const parameters =
    payload.mode === 'benchmark'
      ? await benchmarkParameters(items, payload.options)
      : await computeParameters(items, payload.options)
  process.stdout.write(`${JSON.stringify(parameters)}\n`)
}

await main().catch((error: unknown) => {
  const message =
    error instanceof Error ? (error.stack ?? error.message) : String(error)
  process.stderr.write(`${message}\n`)
  process.exitCode = 1
})
