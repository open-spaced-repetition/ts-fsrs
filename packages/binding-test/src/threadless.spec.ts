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

function createItem() {
  return new FSRSBindingItem([
    new FSRSBindingReview(3, 0),
    new FSRSBindingReview(4, 1),
  ])
}

function createTrainingItems() {
  return convertCsvToFsrsItems(
    fs.readFileSync(new URL('./revlog.csv', import.meta.url)),
    4,
    'Asia/Shanghai'
  )
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

  test('computes parameters without progress', () => {
    const parameters = computeParameters([createItem()], {
      enableShortTerm: true,
    })

    expect(parameters).toHaveLength(21)
  })

  test('evaluates time-series splits without progress', () => {
    const metrics = evaluateWithTimeSeriesSplits(createTrainingItems(), {
      enableShortTerm: true,
    })

    expect(metrics).toEqual(
      expect.objectContaining({
        logLoss: expect.any(Number),
        rmseBins: expect.any(Number),
      })
    )
  })

  test('reports training progress', () => {
    const updates: Array<[number, number]> = []
    const parameters = computeParameters(createTrainingItems(), {
      enableShortTerm: true,
      progress: (current, total) => {
        updates.push([current, total])
      },
    })

    expect(parameters).toHaveLength(21)
    expect(updates.length).toBeGreaterThan(1)
    expect(updates.at(-1)?.[0]).toBe(updates.at(-1)?.[1])
  })

  test('reports each time-series split', () => {
    const updates: Array<[number, number]> = []
    const metrics = evaluateWithTimeSeriesSplits(createTrainingItems(), {
      enableShortTerm: true,
      progress: (current, total) => {
        updates.push([current, total])
      },
    })

    expect(metrics).toEqual(
      expect.objectContaining({
        logLoss: expect.any(Number),
        rmseBins: expect.any(Number),
      })
    )
    expect(updates).toEqual([
      [1, 5],
      [2, 5],
      [3, 5],
      [4, 5],
      [5, 5],
    ])
  })

  test('progress can stop training', () => {
    expect(() =>
      computeParameters(createTrainingItems(), {
        enableShortTerm: true,
        progress: () => false,
      })
    ).toThrow('compute_parameters failed')
  })
})
