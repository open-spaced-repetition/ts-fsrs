import {
  BindingCostAdrTrainingConfig,
  trainCostAdrExperiment,
} from '@open-spaced-repetition/binding'

const defaultParameters = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666,
  0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658,
  0.1542,
]

const deterministicConfig = {
  deckSize: 20,
  learnSpan: 30,
  learnLimit: 2,
  reviewLimit: 20,
}

const deterministicOptions = {
  parameters: defaultParameters,
  populationSize: 2,
  generations: 1,
  seed: 7,
  simulationSeed: 11,
  costWeights: [0, 4],
  baselineDesiredRetentions: [0.8, 0.9],
  timeout: 1,
}

const progressConfig = {
  deckSize: 100,
  learnSpan: 120,
  learnLimit: 5,
  reviewLimit: 80,
}

const progressOptions = {
  parameters: defaultParameters,
  populationSize: 4,
  generations: 3,
  seed: 7,
  simulationSeed: 11,
  costWeights: [0, 4, 16],
  baselineDesiredRetentions: [0.8, 0.9, 0.95],
  timeout: 1,
}

const abortOptions = {
  parameters: defaultParameters,
  populationSize: 8,
  generations: 8,
  seed: 7,
  simulationSeed: 11,
  costWeights: [0, 4, 16, 64],
  baselineDesiredRetentions: [0.75, 0.85, 0.9, 0.95],
  timeout: 1,
}

describe('Cost ADR training', () => {
  test('returns fsrs-rs training output shape', async () => {
    const result = await trainCostAdrExperiment({
      simulatorConfig: deterministicConfig,
      ...deterministicOptions,
    })

    expect(result.policy.coefficients).toHaveLength(15)
    expect(result.policy.coefficients.every(Number.isFinite)).toBe(true)

    expect(result.baselineMetrics).toHaveLength(
      deterministicOptions.baselineDesiredRetentions.length
    )
    expect(result.bestCostWeightMetrics).toHaveLength(
      deterministicOptions.costWeights.length
    )
    expect(result.bestHypervolumeDelta).toBeCloseTo(
      result.bestHypervolume - result.baselineHypervolume
    )
    expect(result.trainingSeconds).toBeGreaterThanOrEqual(0)
    expect(result.history).toHaveLength(deterministicOptions.generations)
    expect(result.history[0]).toEqual(
      expect.objectContaining({
        generation: 0,
        bestHypervolumeDelta: expect.any(Number),
        generationBestHypervolumeDelta: expect.any(Number),
        meanHypervolumeDelta: expect.any(Number),
        sigma: expect.any(Number),
      })
    )
  })

  test('reports progress', async () => {
    let calls = 0
    let lastCurrent = 0
    let lastTotal = 0
    const result = await trainCostAdrExperiment({
      simulatorConfig: progressConfig,
      ...progressOptions,
      progress: (current: number, total: number) => {
        calls++
        lastCurrent = current
        lastTotal = total
      },
    })

    expect(result.history).toHaveLength(progressOptions.generations)
    expect(calls).toBeGreaterThan(0)
    expect(lastCurrent).toBeGreaterThan(0)
    expect(lastTotal).toBe(
      progressOptions.populationSize * progressOptions.generations
    )
  })

  test('returning false from progress aborts training', async () => {
    let calls = 0
    await expect(
      trainCostAdrExperiment({
        simulatorConfig: {
          deckSize: 200,
          learnSpan: 180,
          learnLimit: 5,
          reviewLimit: 80,
        },
        ...abortOptions,
        progress: () => {
          calls++
          if (calls >= 2) {
            return false
          }
        },
      })
    ).rejects.toThrow(/Interrupted/)
    expect(calls).toBeGreaterThanOrEqual(2)
  })

  test('clamps out-of-bounds initial coefficients to the training bounds', async () => {
    const result = await trainCostAdrExperiment({
      simulatorConfig: {
        deckSize: 120,
        learnSpan: 15,
        learnLimit: 20,
        reviewLimit: 200,
      },
      parameters: defaultParameters,
      populationSize: 2,
      generations: 1,
      lowerBound: -1,
      upperBound: 1,
      initialCoefficients: new Array(15).fill(10),
      costWeights: [0, 16],
      baselineDesiredRetentions: [0.8, 0.9],
      seed: 7,
      simulationSeed: 11,
    })

    expect(result.policy.coefficients).toHaveLength(15)
    expect(
      result.policy.coefficients.every((value) => value >= -1 && value <= 1)
    ).toBe(true)
  })

  // Inner-form CostAdrTrainingConfig wrapper applies overrides + fsrs defaults.
  test('BindingCostAdrTrainingConfig exposes the fsrs config (inner form)', () => {
    const config = new BindingCostAdrTrainingConfig({
      populationSize: 6,
      generations: 4,
      costWeights: [0, 8, 16],
    })
    expect(config.populationSize).toBe(6)
    expect(config.generations).toBe(4)
    expect(config.costWeights).toEqual([0, 8, 16])

    expect(config.sigma0).toBeGreaterThan(0)
    expect(config.initialCoefficients).toHaveLength(15)
    expect(config.baselineDesiredRetentions.length).toBeGreaterThan(0)
  })
})
