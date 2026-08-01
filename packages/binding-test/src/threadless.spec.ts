import { execFileSync } from 'node:child_process'
import * as fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  computeParameters,
  convertCsvToFsrsItems,
  evaluateWithTimeSeriesSplits,
  FSRSBindingItem,
  FSRSBindingReview,
} from '@open-spaced-repetition/binding'

const describeThreadless =
  process.env.NAPI_RS_WASI_FLAVOR === 'wasm32-wasip1' ? describe : describe.skip
const progressError =
  'Progress callbacks are not supported by the threadless wasm32-wasip1 target'

function createItem() {
  return new FSRSBindingItem([
    new FSRSBindingReview(3, 0),
    new FSRSBindingReview(4, 1),
  ])
}

describeThreadless('threadless WASI binding', () => {
  test('runs scheduling, training, and evaluation from CommonJS', () => {
    const revlogPath = fileURLToPath(new URL('./revlog.csv', import.meta.url))

    execFileSync(
      process.execPath,
      [
        '--input-type=commonjs',
        '--eval',
        `
          const { readFileSync } = require('node:fs')
          const {
            computeParameters,
            convertCsvToFsrsItems,
            evaluateWithTimeSeriesSplits,
            FSRSBinding,
          } = require('@open-spaced-repetition/binding')

          const states = new FSRSBinding().nextStates(null, 0.9, 0)
          if (!states.good) throw new Error('CommonJS binding returned no good state')

          const items = convertCsvToFsrsItems(
            readFileSync(${JSON.stringify(revlogPath)}),
            4,
            'Asia/Shanghai'
          )

          ;(async () => {
            const parameters = await computeParameters(items, {
              enableShortTerm: true,
            })
            if (parameters.length !== 21) {
              throw new Error('CommonJS computeParameters returned invalid parameters')
            }

            const metrics = await evaluateWithTimeSeriesSplits(items, {
              enableShortTerm: true,
            })
            if (!Number.isFinite(metrics.logLoss) || !Number.isFinite(metrics.rmseBins)) {
              throw new Error('CommonJS evaluation returned invalid metrics')
            }
          })().catch((error) => {
            console.error(error)
            process.exitCode = 1
          })
        `,
      ],
      { env: process.env, timeout: 60_000 }
    )
  })

  test('computes parameters without progress', async () => {
    const parameters = await computeParameters([createItem()], {
      enableShortTerm: true,
    })

    expect(parameters).toHaveLength(21)
  })

  test('evaluates time-series splits without progress', async () => {
    const items = convertCsvToFsrsItems(
      fs.readFileSync(new URL('./revlog.csv', import.meta.url)),
      4,
      'Asia/Shanghai'
    )
    const metrics = await evaluateWithTimeSeriesSplits(items, {
      enableShortTerm: true,
    })

    expect(Number.isFinite(metrics.logLoss)).toBe(true)
    expect(Number.isFinite(metrics.rmseBins)).toBe(true)
  })

  test.each([
    ['computeParameters', computeParameters],
    ['evaluateWithTimeSeriesSplits', evaluateWithTimeSeriesSplits],
  ])('rejects progress before running %s', async (_name, run) => {
    let called = false
    const result = run([createItem()], {
      enableShortTerm: true,
      progress: () => {
        called = true
      },
    })

    await expect(result).rejects.toThrow(progressError)
    expect(called).toBe(false)
  })
})
