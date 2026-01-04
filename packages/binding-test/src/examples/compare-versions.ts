#!/usr/bin/env NAPI_RS_FORCE_WASI=1 tsx

import { readFileSync } from 'node:fs'
import { convertCsvToFsrsItems } from '@open-spaced-repetition/binding'
import {
  getTimezoneOffset,
  parseCSVToFSRSItems,
} from '../helpers/csv-parser.js'

const csvPath = new URL('../revlog.csv', import.meta.url).pathname

console.log('Testing TS version...')
console.time('TS parsing time')
const tsItems = parseCSVToFSRSItems(csvPath, 4, 'Asia/Shanghai')
console.timeEnd('TS parsing time')
console.log(`TS version: fsrs_items.len() = ${tsItems.length}`)

console.log('\nTesting RS version...')
console.time('RS parsing time')
const csvBuffer = readFileSync(csvPath)
const rsItems = convertCsvToFsrsItems(csvBuffer, 4, 'Asia/Shanghai', (ms, tz) =>
  getTimezoneOffset(tz, ms)
)
console.timeEnd('RS parsing time')
console.log(`RS version: fsrs_items.len() = ${rsItems.length}`)

console.log(`\nDifference: ${rsItems.length - tsItems.length}`)

if (tsItems.length === rsItems.length) {
  console.log('✅ Counts match!')
} else {
  console.log('❌ Counts do NOT match')
  process.exit(1)
}
