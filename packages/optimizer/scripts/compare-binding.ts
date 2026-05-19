import fs from 'node:fs'
import { performance } from 'node:perf_hooks'
import {
  computeParameters as computeBindingParameters,
  convertCsvToFsrsItems as convertBindingCsvToFsrsItems,
} from '../../binding/dist/index.mjs'
import {
  computeParameters,
  convertCsvToFsrsItems,
  getTimezoneOffset,
} from '../src/index.ts'

const csvPath = new URL('../../binding-test/src/revlog.csv', import.meta.url)
const gradientEpsilon = process.env.GRADIENT_EPSILON
  ? Number.parseFloat(process.env.GRADIENT_EPSILON)
  : undefined
const shortTermMode = process.env.ENABLE_SHORT_TERM
  ? process.env.ENABLE_SHORT_TERM === 'true'
  : undefined

const compareMode = async (enableShortTerm: boolean) => {
  const startedAt = performance.now()
  const optimizerItems = await convertCsvToFsrsItems(csvPath, {
    nextDayStartsAt: 4,
    timezone: 'Asia/Shanghai',
  })
  const bindingItems = convertBindingCsvToFsrsItems(
    fs.readFileSync(csvPath),
    4,
    'Asia/Shanghai',
    (timestamp: number, timezone: string) =>
      getTimezoneOffset(timezone, timestamp)
  )
  const optimizerParameters = await computeParameters(optimizerItems, {
    enableShortTerm,
    gradientEpsilon,
    timeout: 10,
  })
  const bindingParameters = await computeBindingParameters(bindingItems, {
    enableShortTerm,
    timeout: 10,
  })

  const diffs = optimizerParameters.map((parameter, index) => ({
    binding: bindingParameters[index],
    diff: parameter - bindingParameters[index],
    index,
    optimizer: parameter,
  }))
  const maxAbsDiff = diffs.reduce(
    (max, current) => Math.max(max, Math.abs(current.diff)),
    0
  )
  const elapsedMs = performance.now() - startedAt

  return {
    diffs,
    elapsedMs,
    enableShortTerm,
    maxAbsDiff,
  }
}

const modes =
  typeof shortTermMode === 'boolean' ? [shortTermMode] : [true, false]
const results = []
for (const mode of modes) {
  results.push(await compareMode(mode))
}
console.log(JSON.stringify(results, null, 2))
