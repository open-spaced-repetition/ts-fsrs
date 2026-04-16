import * as fs from 'node:fs'

import { computeOptimalSteps } from '@open-spaced-repetition/binding'
import { Bench } from 'tinybench'

const csvBuffer = fs.readFileSync(new URL('../revlog.csv', import.meta.url))

const bench = new Bench({ iterations: 100 })

bench.add('computeOptimalSteps (decay=0.5, dr=0.9)', () => {
  computeOptimalSteps(csvBuffer, 0.9, 0.5)
})

bench.add('computeOptimalSteps (params array, dr=0.9)', () => {
  const params = [
    0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722,
    0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425,
    0.0912, 0.0658, 0.1542,
  ]
  computeOptimalSteps(csvBuffer, 0.9, params)
})

bench.add('computeOptimalSteps (decay=0.5, dr=0.8)', () => {
  computeOptimalSteps(csvBuffer, 0.8, 0.5)
})

await bench.run()

console.table(bench.table())
