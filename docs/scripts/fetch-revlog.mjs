import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// The sample review log the playground and the trainer both read. It is not
// committed: 4.6 MB of fixture would dominate the repository, and the file is
// reproducible from its canonical URL. The digest pins exactly which revision
// the examples were verified against — update it deliberately, never to make a
// failing build pass.
const SOURCE_URL =
  'https://github.com/open-spaced-repetition/fsrs-rs/files/15046782/revlog.csv'
const EXPECTED_SHA256 =
  '80b260e7e140755123179a5f1be931b586c031e9c594e2054c3bc267e8f1f369'

const target = fileURLToPath(
  new URL('../src/public/revlog.csv', import.meta.url)
)

/**
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function isUpToDate() {
  try {
    // Hashing the existing copy also catches a truncated or corrupted download
    // from an earlier run, which a size check alone would accept.
    return sha256(readFileSync(target)) === EXPECTED_SHA256
  } catch {
    return false
  }
}

if (isUpToDate()) {
  process.exit(0)
}

const response = await fetch(SOURCE_URL)
if (!response.ok) {
  throw new Error(
    `Failed to download ${SOURCE_URL}: ${response.status} ${response.statusText}`
  )
}

const body = new Uint8Array(await response.arrayBuffer())
const digest = sha256(body)
if (digest !== EXPECTED_SHA256) {
  throw new Error(
    `Checksum mismatch for ${SOURCE_URL}\n  expected ${EXPECTED_SHA256}\n  received ${digest} (${body.byteLength} bytes)`
  )
}

mkdirSync(path.dirname(target), { recursive: true })
writeFileSync(target, body)
