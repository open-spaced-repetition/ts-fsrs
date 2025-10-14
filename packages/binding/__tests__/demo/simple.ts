#!/usr/bin/env -S TSX_TSCONFIG_PATH=./__tests__/tsconfig.json NAPI_RS_FORCE_WASI=1 tsx

import { readFileSync } from 'node:fs'
import {
  computeParameters,
  convertCsvToFsrsItems,
} from '@open-spaced-repetition/binding/index.js'
import { getTimezoneOffset } from '../helpers/csv-parser.js'

// Read revlog.csv
// Please download from: https://github.com/open-spaced-repetition/fsrs-rs/files/15046782/revlog.csv
console.time('parsing csv time')
const csvBuffer = readFileSync(new URL('../revlog.csv', import.meta.url))
const fsrsItems = convertCsvToFsrsItems(
  csvBuffer,
  4,
  'Asia/Shanghai',
  (ms, tz) => getTimezoneOffset(tz, ms)
)
console.timeEnd('parsing csv time')
console.log(`fsrs_items.len() = ${fsrsItems.length}`)

console.time('full training time')

async function computeParametersWrapper(enableShortTerm: boolean) {
  // create FSRS instance and optimize
  const optimizedParameters = await computeParameters(fsrsItems, {
    enableShortTerm,
    numRelearningSteps: 1,
    timeout: 100 /** 100ms */,
    progress: (cur, total) => {
      console.debug(
        `[enableShortTerm = ${enableShortTerm ? 1 : 0}] Progress: ${cur}/${total}`
      )
    },
  })
  console.log(
    `[enableShortTerm = ${enableShortTerm}] optimized parameters:`,
    optimizedParameters
  )
}
await Promise.all([
  computeParametersWrapper(true),
  computeParametersWrapper(false),
])

console.timeEnd('full training time')
