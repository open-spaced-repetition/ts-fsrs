import * as fs from 'node:fs'

import { computeOptimalSteps } from '@open-spaced-repetition/binding'
import { Bench } from 'tinybench'

const csvBuffer = fs.readFileSync(new URL('../revlog.csv', import.meta.url))

const bench = new Bench({ iterations: 100 })

bench.add('computeOptimalSteps (decay=0.5, dr=0.9)', () => {
  computeOptimalSteps(csvBuffer, 0.9, 0.5)
})

bench.add('computeOptimalSteps (FSRS-6 decay=0.1542, dr=0.9)', () => {
  computeOptimalSteps(csvBuffer, 0.9, 0.1542)
})

bench.add('computeOptimalSteps (decay=0.5, dr=0.8)', () => {
  computeOptimalSteps(csvBuffer, 0.8, 0.5)
})

await bench.run()

console.table(bench.table())
