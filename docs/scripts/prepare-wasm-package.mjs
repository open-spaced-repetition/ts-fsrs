import { copyFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const bindingDir = fileURLToPath(
  new URL('../../packages/binding/', import.meta.url)
)
const outputDir = path.join(bindingDir, 'dist')
const packageDir = path.join(bindingDir, 'npm/wasm32-wasip1')
const files = [
  'fsrs-binding.wasip1-browser.js',
  'fsrs-binding.wasip1-deferred.d.ts',
  'fsrs-binding.wasip1-deferred.js',
  'fsrs-binding.wasip1.cjs',
  'fsrs-binding.wasip1.d.cts',
  'fsrs-binding.wasm32-wasip1.wasm',
]

for (const file of files) {
  copyFileSync(path.join(outputDir, file), path.join(packageDir, file))
}
