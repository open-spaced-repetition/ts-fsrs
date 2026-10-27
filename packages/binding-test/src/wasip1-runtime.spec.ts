import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const testThreadless =
  process.env.NAPI_RS_WASI_FLAVOR === 'wasm32-wasip1' ? test : test.skip

// A subprocess timeout also detects cleanup that leaves Node alive.
testThreadless.each(['cjs', 'deferred'])(
  '%s trains both models and disposes without shared memory or workers',
  (entry) => {
    execFileSync(
      process.execPath,
      [
        fileURLToPath(
          new URL('../scripts/check-wasip1-runtime.mjs', import.meta.url)
        ),
        fileURLToPath(new URL('../../binding/dist/', import.meta.url)),
        entry,
      ],
      { timeout: 120_000, stdio: 'pipe' }
    )
  },
  130_000
)
