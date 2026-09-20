import * as fs from 'node:fs'
import {
  computeParameters,
  convertCsvToFsrsItems,
  evaluateWithTimeSeriesSplits,
  FSRSBindingItem,
  FSRSBindingReview,
} from '@open-spaced-repetition/binding'

const isThreadless = process.env.NAPI_RS_WASI_FLAVOR === 'wasm32-wasip1'
const testWithThreads = isThreadless ? test.skip : test

describe('FSRS compute_parameters', () => {
  function createMinimalTestItem(): FSRSBindingItem {
    return new FSRSBindingItem([
      new FSRSBindingReview(3, 0),
      new FSRSBindingReview(4, 1),
    ])
  }

  let allItems: FSRSBindingItem[] = []
  beforeAll(() => {
    const csvBuffer = fs.readFileSync(new URL('./revlog.csv', import.meta.url))
    allItems = convertCsvToFsrsItems(csvBuffer, 4, 'Asia/Shanghai', 'FSRS-6')
  })
  for (const shortTerm of [true, false]) {
    test(`compute_parameters with test data ${shortTerm ? 'enabled' : 'disabled'}`, async () => {
      if (allItems.length === 0) {
        throw new Error('No valid items parsed from CSV, skipping test')
      }

      try {
        const parameters = await computeParameters(allItems, {
          enableShortTerm: shortTerm,
          modelVersion: 'FSRS-6',
          ...(isThreadless
            ? {}
            : {
                progress: (current: number, total: number) => {
                  console.debug(
                    `[shortTerm: ${shortTerm}] Progress: ${current}/${total}`
                  )
                },
                timeout: 500,
              }),
        })

        expect(parameters).toBeDefined()
        expect(Array.isArray(parameters)).toBe(true)
        expect(parameters.length).toBeGreaterThan(0)
        console.log(
          `Computed parameters[${shortTerm ? 'shortTerm' : 'longTerm'}]:`,
          parameters
        )
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.log('Error caught:', errorMsg)
        throw error
      }
    }, 180_000)
  }

  test('compute_parameters with minimal data', async () => {
    const item = createMinimalTestItem()
    const parameters = await computeParameters([item], {
      enableShortTerm: true,
    })

    expect(parameters).toBeDefined()
    expect(Array.isArray(parameters)).toBe(true)
    console.log('Minimal data parameters:', parameters)
  })

  test.each([
    'FSRS-6',
    'FSRS-7',
  ] as const)('selects %s for training and evaluation', async (modelVersion) => {
    const items = convertCsvToFsrsItems(
      fs.readFileSync(new URL('./revlog.csv', import.meta.url)),
      4,
      'Asia/Shanghai',
      modelVersion
    ).slice(0, 2048)
    const options = {
      enableShortTerm: true,
      modelVersion,
      timeout: 5,
      trainingConfig: {
        numEpochs: 2,
        batchSize: 128,
        seed: 2023,
        maxSeqLen: 256,
        learningRate: 0.04,
        gamma: 1,
      },
    }
    const parameters = await computeParameters(items, options)
    expect(parameters).toHaveLength(modelVersion === 'FSRS-6' ? 21 : 34)
    expect(parameters.every(Number.isFinite)).toBe(true)
    const metrics = await evaluateWithTimeSeriesSplits(items, options)
    expect(Number.isFinite(metrics.logLoss)).toBe(true)
    expect(Number.isFinite(metrics.rmseBins)).toBe(true)
  })

  test('explicit FSRS6 preserves its legacy training defaults', async () => {
    const items = allItems.slice(0, 2048)
    const parameters = await computeParameters(items, {
      enableShortTerm: true,
      modelVersion: 'FSRS-6',
      timeout: 5,
    })
    const explicit = await computeParameters(items, {
      enableShortTerm: true,
      modelVersion: 'FSRS-6',
      timeout: 5,
      trainingConfig: {
        numEpochs: 5,
        batchSize: 512,
        seed: 2023,
        maxSeqLen: 256,
        learningRate: 0.04,
        gamma: 1,
      },
    })
    expect(parameters).toHaveLength(21)
    expect(parameters).toEqual(explicit)
  })

  test('omitted modelVersion trains and evaluates FSRS7', async () => {
    const items = convertCsvToFsrsItems(
      fs.readFileSync(new URL('./revlog.csv', import.meta.url)),
      4,
      'Asia/Shanghai'
    ).slice(0, 2048)
    const options = { enableShortTerm: true, timeout: 5 }
    const defaults = await computeParameters(items, options)
    const explicit = await computeParameters(items, {
      ...options,
      modelVersion: 'FSRS-7',
    })
    expect(defaults).toHaveLength(34)
    expect(defaults).toEqual(explicit)
    const metrics = await evaluateWithTimeSeriesSplits(items, options)
    const explicitMetrics = await evaluateWithTimeSeriesSplits(items, {
      ...options,
      modelVersion: 'FSRS-7',
    })
    expect(metrics.logLoss).toBeCloseTo(explicitMetrics.logLoss, 6)
    expect(metrics.rmseBins).toBeCloseTo(explicitMetrics.rmseBins, 6)
  })

  test('rejects an unsupported modelVersion', () => {
    expect(() =>
      computeParameters([createMinimalTestItem()], {
        enableShortTerm: true,
        modelVersion: 'FSRS-8' as 'FSRS-6',
      })
    ).toThrow()
  })

  test('compute_parameters passes external training config', async () => {
    const item = createMinimalTestItem()

    await expect(
      computeParameters([item], {
        enableShortTerm: true,
        trainingConfig: {
          numEpochs: 5,
          batchSize: 0,
          seed: 2023,
          maxSeqLen: 256,
          learningRate: 0.04,
          gamma: 0.0001,
        },
      })
    ).rejects.toThrow('compute_parameters failed')
  })

  testWithThreads(
    'evaluate_parameters with time series splits',
    async () => {
      if (allItems.length === 0) {
        throw new Error('No valid items parsed from CSV, skipping test')
      }

      const metrics = await evaluateWithTimeSeriesSplits(allItems, {
        enableShortTerm: true,
        modelVersion: 'FSRS-6',
        progress: (current: number, total: number) => {
          console.debug(`[evaluate] Progress: ${current}/${total}`)
        },
        timeout: 500,
      })

      // FSRS-6 reference after the fsrs-rs optimizer update to 4c168e4.
      expect(metrics.logLoss).toBeCloseTo(0.32719284, 4)
      expect(metrics.rmseBins).toBeCloseTo(0.026863022, 4)
    },
    180_000
  )

  testWithThreads('returning false aborts computation', async () => {
    let callCount = 0
    const result = computeParameters(allItems, {
      enableShortTerm: true,
      modelVersion: 'FSRS-6',
      progress: (current: number, total: number) => {
        callCount++
        console.debug(`[abort test] ${current}/${total}, call #${callCount}`)
        if (callCount >= 2) {
          return false
        }
      },
      timeout: 100,
    })
    await expect(result).rejects.toThrow()
    expect(callCount).toBeGreaterThanOrEqual(2)
  })

  testWithThreads.each([
    { name: 'computeParameters', fn: computeParameters },
    {
      name: 'evaluateWithTimeSeriesSplits',
      fn: evaluateWithTimeSeriesSplits,
    },
  ])('throwing error in callback aborts $name', async ({ fn }) => {
    let callCount = 0
    const result = fn(allItems, {
      enableShortTerm: true,
      modelVersion: 'FSRS-6',
      progress: () => {
        callCount++
        if (callCount >= 2) {
          throw new Error('User cancelled')
        }
      },
      timeout: 100,
    })
    await expect(result).rejects.toThrow()
  })
})
