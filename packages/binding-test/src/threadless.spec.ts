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

function createTrainingItems(modelVersion?: 'FSRS-6' | 'FSRS-7') {
  return convertCsvToFsrsItems(
    fs.readFileSync(new URL('./revlog.csv', import.meta.url)),
    4,
    'Asia/Shanghai',
    modelVersion
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
            const updates = []
            let completed = false
            let lateProgress = false
            const parameters = await computeParameters(items, {
              enableShortTerm: true,
              timeout: 10,
              progress: (current, total) => {
                if (completed) lateProgress = true
                updates.push([current, total])
              },
            })
            completed = true
            const updatesAtCompletion = updates.length
            await new Promise((resolve) => setTimeout(resolve, 50))

            if (parameters.length !== 34) {
              throw new Error('CommonJS computeParameters returned invalid parameters')
            }
            if (updates.length < 2) {
              throw new Error('CommonJS computeParameters reported insufficient progress')
            }
            const [current, total] = updates.at(-1)
            if (current !== total) {
              throw new Error('CommonJS computeParameters did not report completion')
            }
            if (lateProgress || updates.length !== updatesAtCompletion) {
              throw new Error('CommonJS computeParameters reported progress after completion')
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
    const result = computeParameters([createItem()], {
      enableShortTerm: true,
    })
    expect(result).toBeInstanceOf(Promise)

    const parameters = await result
    expect(parameters).toHaveLength(34)
  })

  test('evaluates time-series splits without progress', async () => {
    const result = evaluateWithTimeSeriesSplits(createTrainingItems(), {
      enableShortTerm: true,
    })
    expect(result).toBeInstanceOf(Promise)

    const metrics = await result
    expect(metrics).toEqual(
      expect.objectContaining({
        logLoss: expect.any(Number),
        rmseBins: expect.any(Number),
      })
    )
  })

  test.each([
    'FSRS-6',
    'FSRS-7',
  ] as const)('reports %s training progress', async (modelVersion) => {
    const updates: Array<[number, number]> = []
    const parameters = await computeParameters(
      createTrainingItems(modelVersion),
      {
        enableShortTerm: true,
        modelVersion,
        progress: (current, total) => {
          updates.push([current, total])
        },
      }
    )

    expect(parameters).toHaveLength(modelVersion === 'FSRS-6' ? 21 : 34)
    expect(parameters.every(Number.isFinite)).toBe(true)
    expect(updates.length).toBeGreaterThan(1)
    expect(updates.at(-1)?.[0]).toBe(updates.at(-1)?.[1])
  })

  test.each([
    'FSRS-6',
    'FSRS-7',
  ] as const)('reports each %s time-series split', async (modelVersion) => {
    const updates: Array<[number, number]> = []
    const metrics = await evaluateWithTimeSeriesSplits(
      createTrainingItems(modelVersion),
      {
        enableShortTerm: true,
        modelVersion,
        progress: (current, total) => {
          updates.push([current, total])
        },
      }
    )

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

  test.each([
    'FSRS-6',
    'FSRS-7',
  ] as const)('progress can stop %s training', async (modelVersion) => {
    await expect(
      computeParameters(createTrainingItems(modelVersion), {
        enableShortTerm: true,
        modelVersion,
        progress: () => false,
      })
    ).rejects.toThrow('compute_parameters failed')
  })
})
