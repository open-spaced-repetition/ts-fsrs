import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const files = {
  'dynamic-node.js': 'dynamic-node.js',
  'dynamic-browser.js': 'dynamic-browser.js',
  'dynamic.d.ts': 'dynamic.d.ts',
  'browser-entry.js': 'browser.js',
}
const src = join(__dirname, 'js')
const dest = join(__dirname, 'dist')

mkdirSync(dest, { recursive: true })
for (const [source, target] of Object.entries(files)) {
  copyFileSync(join(src, source), join(dest, target))
}
