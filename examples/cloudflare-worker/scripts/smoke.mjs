import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'

const externalWorkerUrl = process.env.WORKER_URL
const workerUrl = (externalWorkerUrl ?? 'http://127.0.0.1:8787').replace(
  /\/$/,
  ''
)
let wrangler
const revlog = await readFile(
  process.env.REVLOG_PATH ??
    new URL('../../../packages/binding-test/src/revlog.csv', import.meta.url)
)

async function readJson(path, init) {
  const response = await fetch(`${workerUrl}${path}`, init)
  if (!response.ok) {
    throw new Error(`${response.status}: ${await response.text()}`)
  }
  return response.json()
}

try {
  if (!externalWorkerUrl) {
    // ponytail: fixed local port keeps the smoke dependency-free; set
    // WORKER_URL when parallel runs need an isolated port.
    wrangler = spawn(
      'pnpm',
      [
        'exec',
        'wrangler',
        'dev',
        '--local',
        '--ip',
        '127.0.0.1',
        '--port',
        '8787',
        '--log-level',
        'error',
      ],
      {
        env: { ...process.env, WRANGLER_WRITE_LOGS: 'false' },
        stdio: 'inherit',
      }
    )

    let ready = false
    for (let attempt = 0; attempt < 100; attempt++) {
      if (wrangler.exitCode !== null) {
        throw new Error(`wrangler dev exited with code ${wrangler.exitCode}`)
      }
      try {
        const response = await fetch(`${workerUrl}/health`)
        if (response.ok) {
          ready = true
          break
        }
      } catch {}
      await sleep(100)
    }
    assert.equal(ready, true, 'wrangler dev did not become ready')
  }

  const firstHealth = await readJson('/health')
  const secondHealth = await readJson('/health')
  const computation = await readJson(
    '/compute?nextDayStartsAt=4&timezone=Asia%2FShanghai',
    {
      method: 'POST',
      headers: { 'content-type': 'text/csv' },
      body: revlog,
    }
  )

  assert.deepEqual(
    {
      ok: firstHealth.ok,
      status: firstHealth.status,
      initializationCount: firstHealth.initializationCount,
    },
    { ok: true, status: 'ready', initializationCount: 1 }
  )
  assert.equal(secondHealth.initializationCount, 1)
  assert.equal(computation.ok, true)
  assert.equal(computation.csvBytes, revlog.byteLength)
  assert.equal(computation.fsrsItemsCount, 88_158)
  assert.equal(computation.parameters.length, 21)
  assert.equal(computation.parameters.every(Number.isFinite), true)

  console.log({
    workerUrl,
    bindingVersion: firstHealth.bindingVersion,
    initializationCount: secondHealth.initializationCount,
    csvBytes: computation.csvBytes,
    fsrsItemsCount: computation.fsrsItemsCount,
    parseMs: computation.parseMs,
    trainingMs: computation.trainingMs,
    parameterCount: computation.parameters.length,
  })
} finally {
  if (wrangler?.exitCode === null) {
    wrangler.kill()
    await once(wrangler, 'exit')
  }
}
