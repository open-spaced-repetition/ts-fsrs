import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const files = [
  'dynamic-wasi.cjs',
  'dynamic-wasi-browser.js',
  'dynamic-wasi.d.ts',
]
const src = join(__dirname, 'js')
const dest = join(__dirname, 'dist')

mkdirSync(dest, { recursive: true })
for (const f of files) {
  copyFileSync(join(src, f), join(dest, f))
}
