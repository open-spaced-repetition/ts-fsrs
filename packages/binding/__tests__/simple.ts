#!/usr/bin/env -S TSX_TSCONFIG_PATH=./__tests__/tsconfig.json NAPI_RS_FORCE_WASI=1 tsx

import { computeParameters } from '@open-spaced-repetition/binding/index.js'
import { parseCSVToFSRSItems } from './helpers/csv-parser.js'

// Read revlog.csv
// Please download from: https://github.com/open-spaced-repetition/fsrs-rs/files/15046782/revlog.csv
console.time('parsing csv time')
const fsrsItems = parseCSVToFSRSItems(
  new URL('./revlog.csv', import.meta.url).pathname
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
      console.log(cur, total)
    },
  })
  console.log(
    `[enableShortTerm=${enableShortTerm}]optimized parameters:`,
    optimizedParameters
  )
}
await Promise.all([
  computeParametersWrapper(true),
  computeParametersWrapper(false),
])

console.timeEnd('full training time')
