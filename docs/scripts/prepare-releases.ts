import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { clearLine, cursorTo } from 'node:readline'
import { prepareReleases } from '../src/releases/index.ts'
import { fetchReleases } from './fetch-releases.ts'

console.log('Fetching GitHub releases...')
const releases = await fetchReleases(process.env.GITHUB_TOKEN)
mkdirSync(new URL('../.generated/', import.meta.url), { recursive: true })
writeFileSync(
  new URL('../.generated/releases.json', import.meta.url),
  `${JSON.stringify(releases, null, 2)}\n`
)
let lastStep = -1
const count = prepareReleases(
  path.resolve(import.meta.dirname, '../..'),
  process.env.DOCS_BASE ?? '/',
  (completed, total) => {
    const percent = Math.floor((completed / total) * 100)
    const step = Math.floor(percent / 25)
    if (!process.stdout.isTTY && step === lastStep) return
    lastStep = step
    const filled = Math.floor((completed / total) * 24)
    const bar = '#'.repeat(filled) + '-'.repeat(24 - filled)
    if (process.stdout.isTTY) {
      clearLine(process.stdout, 0)
      cursorTo(process.stdout, 0)
    }
    process.stdout.write(
      `Generating releases [${bar}] ${percent}% (${completed}/${total} files)${!process.stdout.isTTY || completed === total ? '\n' : ''}`
    )
  }
)
console.log(
  `Prepared ${count} release pages from ${releases.length} GitHub releases`
)
