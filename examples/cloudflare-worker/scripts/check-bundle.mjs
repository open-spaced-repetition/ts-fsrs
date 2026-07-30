import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'

const bundle = await readFile('dist/index.js', 'utf8')
const files = await readdir('dist')

assert.equal(
  files.filter((file) => file.endsWith('.wasm')).length,
  1,
  'dry-run must emit exactly one precompiled WASM module'
)
assert.doesNotMatch(
  bundle,
  /\.node(?:["'`/]|$)/,
  'bundle must not load a native addon'
)
assert.doesNotMatch(
  bundle,
  /\bnew Worker\s*\(/,
  'threadless bundle must not create a Worker'
)
assert.doesNotMatch(
  bundle,
  /WebAssembly\.(?:compile|compileStreaming|instantiateStreaming)\s*\(/,
  'bundle must not dynamically compile WASM'
)
