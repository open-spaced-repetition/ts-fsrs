import { AdamOptimizer } from './adam'
import {
  DEFAULT_ADAM_EPSILON,
  DEFAULT_BATCH_SIZE,
  DEFAULT_BETA1,
  DEFAULT_BETA2,
  DEFAULT_GAMMA,
  DEFAULT_GRADIENT_EPSILON,
  DEFAULT_LEARNING_RATE,
  DEFAULT_MAX_SEQ_LEN,
  DEFAULT_NUM_EPOCHS,
  DEFAULT_PARAMETERS,
  DEFAULT_PROGRESS_TIMEOUT,
  DEFAULT_SEED,
  PARAMS_STDDEV,
} from './constants'
import { CosineAnnealingLR } from './cosine-annealing'
import {
  calculateAverageRecall,
  createBatches,
  prepareBatchItems,
  prepareTrainingData,
  recencyWeightedFsrsItems,
  sortItemsByReviewLength,
} from './dataset'
import { batchDataLoss, l2Penalty } from './forward'
import { initializeStabilityParameters, smoothAndFill } from './initialization'
import { clipParameters } from './parameter-clip'
import { createStdRng, shuffleIndices } from './rng'
import type {
  ComputeParametersOptions,
  FSRSItemLike,
  PreparedTrainingItem,
} from './types'
import { normalizeItems } from './types'
import { yieldToEventLoop } from './utils'

type TrainingMode = 'benchmark' | 'compute'

type ResolvedTrainingOptions = {
  adamEpsilon: number
  batchSize: number
  beta1: number
  beta2: number
  enableShortTerm: boolean
  gamma: number
  gradientEpsilon: number
  learningRate: number
  maxSeqLen: number
  numEpochs: number
  numRelearningSteps: number
  seed: number
}

class InterruptedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InterruptedError'
  }
}

class ProgressReporter {
  private readonly progress?: (
    current: number,
    total: number
  ) => boolean | undefined
  private readonly timeout: number
  private readonly signal?: AbortSignal
  private lastReportAt = 0

  constructor(options: ComputeParametersOptions) {
    this.progress = options.progress
    this.timeout = options.timeout ?? DEFAULT_PROGRESS_TIMEOUT
    this.signal = options.signal
  }

  assertNotInterrupted(): void {
    if (this.signal?.aborted) {
      throw new InterruptedError('Computation interrupted')
    }
  }

  async report(current: number, total: number): Promise<void> {
    this.assertNotInterrupted()
    if (!this.progress) {
      return
    }
    const now = Date.now()
    if (current < total && now - this.lastReportAt < this.timeout) {
      return
    }
    this.lastReportAt = now
    try {
      const result = this.progress(current, total)
      if (result === false) {
        throw new InterruptedError(
          'Computation interrupted by progress callback'
        )
      }
    } catch (error) {
      if (error instanceof InterruptedError) {
        throw error
      }
      throw new InterruptedError(
        error instanceof Error ? error.message : 'Computation interrupted'
      )
    }
    await yieldToEventLoop()
  }

  async finish(total: number): Promise<void> {
    await this.report(total, total)
  }
}

function createInitialParameters(
  initialStability: readonly number[],
  enableShortTerm: boolean
): number[] {
  const parameters = [...initialStability, ...DEFAULT_PARAMETERS.slice(4)]
  if (!enableShortTerm) {
    parameters[17] = 0
    parameters[18] = 0
    parameters[19] = 0
  }
  return parameters
}

function batchObjective(
  parameters: readonly number[],
  batch: readonly PreparedTrainingItem[],
  initialParameters: readonly number[],
  totalSize: number,
  gamma: number
): number {
  return (
    batchDataLoss(parameters, batch) +
    l2Penalty(
      parameters,
      initialParameters,
      batch.length,
      totalSize,
      gamma,
      PARAMS_STDDEV
    )
  )
}

function trainableParameterIndices(enableShortTerm: boolean): number[] {
  const indices: number[] = []
  for (let index = 0; index < DEFAULT_PARAMETERS.length; index++) {
    if (!enableShortTerm && index >= 0 && index < 4) {
      continue
    }
    if (!enableShortTerm && index >= 17 && index < 20) {
      continue
    }
    indices.push(index)
  }
  return indices
}

async function numericalGradient(
  parameters: readonly number[],
  batch: readonly PreparedTrainingItem[],
  initialParameters: readonly number[],
  totalSize: number,
  gamma: number,
  gradientEpsilon: number,
  indices: readonly number[],
  reporter: ProgressReporter
): Promise<number[]> {
  const gradients = Array<number>(parameters.length).fill(0)
  const working = [...parameters]

  for (let position = 0; position < indices.length; position++) {
    const index = indices[position]
    const original = working[index]
    const step = gradientEpsilon * Math.max(1, Math.abs(original))

    working[index] = original + step
    const plus = batchObjective(
      working,
      batch,
      initialParameters,
      totalSize,
      gamma
    )

    working[index] = original - step
    const minus = batchObjective(
      working,
      batch,
      initialParameters,
      totalSize,
      gamma
    )

    working[index] = original
    gradients[index] = (plus - minus) / (2 * step)

    if (position % 4 === 3) {
      reporter.assertNotInterrupted()
      await yieldToEventLoop()
    }
  }

  return gradients
}

function evaluateLoss(
  parameters: readonly number[],
  batches: readonly PreparedTrainingItem[][],
  initialParameters: readonly number[],
  totalSize: number,
  gamma: number
): number {
  let loss = 0
  for (const batch of batches) {
    loss += batchObjective(
      parameters,
      batch,
      initialParameters,
      totalSize,
      gamma
    )
  }
  return loss / totalSize
}

function resolveTrainingOptions(
  options: ComputeParametersOptions
): ResolvedTrainingOptions {
  return {
    adamEpsilon: options.adamEpsilon ?? DEFAULT_ADAM_EPSILON,
    batchSize: options.batchSize ?? DEFAULT_BATCH_SIZE,
    beta1: options.beta1 ?? DEFAULT_BETA1,
    beta2: options.beta2 ?? DEFAULT_BETA2,
    enableShortTerm: options.enableShortTerm ?? true,
    gamma: options.gamma ?? DEFAULT_GAMMA,
    gradientEpsilon: options.gradientEpsilon ?? DEFAULT_GRADIENT_EPSILON,
    learningRate: options.learningRate ?? DEFAULT_LEARNING_RATE,
    maxSeqLen: options.maxSeqLen ?? DEFAULT_MAX_SEQ_LEN,
    numEpochs: options.numEpochs ?? DEFAULT_NUM_EPOCHS,
    numRelearningSteps: options.numRelearningSteps ?? 1,
    seed: options.seed ?? DEFAULT_SEED,
  }
}

async function optimizeParameters(
  trainSet: readonly FSRSItemLike[],
  options: ComputeParametersOptions,
  mode: TrainingMode
): Promise<number[]> {
  const items = normalizeItems(trainSet)
  const resolved = resolveTrainingOptions(options)
  const reporter = new ProgressReporter(options)

  let datasetForInitialization: ReturnType<typeof normalizeItems>
  let optimizationSet: ReturnType<typeof normalizeItems>

  if (mode === 'compute') {
    ;[datasetForInitialization, optimizationSet] = prepareTrainingData(items)
    if (optimizationSet.length < 8) {
      return [...DEFAULT_PARAMETERS]
    }
  } else {
    datasetForInitialization = items.filter(
      (item) => item.longTermReviewCnt() === 1
    )
    optimizationSet = items
  }

  const averageRecall = calculateAverageRecall(optimizationSet)
  const [initialStability, ratingCount] = initializeStabilityParameters(
    datasetForInitialization,
    averageRecall
  )
  const initialRatingCount = ratingCount

  const initializedParameters = [
    ...initialStability,
    ...DEFAULT_PARAMETERS.slice(4),
  ]

  if (
    mode === 'compute' &&
    (optimizationSet.length === datasetForInitialization.length ||
      optimizationSet.length < 64)
  ) {
    return initializedParameters
  }

  let weightedTrainSet = recencyWeightedFsrsItems(optimizationSet)
  weightedTrainSet = weightedTrainSet.filter(
    ({ item }) => item.reviews.length <= resolved.maxSeqLen
  )
  weightedTrainSet = sortItemsByReviewLength(weightedTrainSet)

  const initialParameters = clipParameters(
    createInitialParameters(initialStability, resolved.enableShortTerm),
    resolved.numRelearningSteps,
    resolved.enableShortTerm
  )

  if (weightedTrainSet.length === 0) {
    return mode === 'compute' ? initializedParameters : initialParameters
  }

  const preparedBatches = createBatches(
    prepareBatchItems(weightedTrainSet),
    resolved.batchSize
  )
  const totalSize = weightedTrainSet.length
  const iterations =
    (Math.floor(totalSize / resolved.batchSize) + 1) * resolved.numEpochs

  const lrScheduler = new CosineAnnealingLR(iterations, resolved.learningRate)
  const optimizer = new AdamOptimizer(
    DEFAULT_PARAMETERS.length,
    resolved.beta1,
    resolved.beta2,
    resolved.adamEpsilon
  )

  let parameters = [...initialParameters]
  let bestParameters = [...parameters]
  let bestLoss = Number.POSITIVE_INFINITY

  const trainRng = createStdRng(resolved.seed)
  const trainableIndices = trainableParameterIndices(resolved.enableShortTerm)
  const totalProgress = preparedBatches.length * resolved.numEpochs

  for (let epoch = 1; epoch <= resolved.numEpochs; epoch++) {
    const batchOrder = shuffleIndices(preparedBatches.length, trainRng)
    for (let batchIndex = 0; batchIndex < batchOrder.length; batchIndex++) {
      reporter.assertNotInterrupted()
      const batch = preparedBatches[batchOrder[batchIndex]]
      const gradients = await numericalGradient(
        parameters,
        batch,
        initialParameters,
        totalSize,
        resolved.gamma,
        resolved.gradientEpsilon,
        trainableIndices,
        reporter
      )
      const lr = lrScheduler.step()
      parameters = clipParameters(
        optimizer.step(parameters, gradients, lr),
        resolved.numRelearningSteps,
        resolved.enableShortTerm
      )
      const currentProgress =
        (epoch - 1) * preparedBatches.length + batchIndex + 1
      await reporter.report(currentProgress, totalProgress)
    }

    const validLoss = evaluateLoss(
      parameters,
      preparedBatches,
      initialParameters,
      totalSize,
      resolved.gamma
    )
    if (validLoss < bestLoss) {
      bestLoss = validLoss
      bestParameters = [...parameters]
    }
  }

  await reporter.finish(totalProgress)
  if (mode === 'benchmark') {
    return bestParameters
  }

  const optimizedInitialStability = new Map<number, number>([
    [1, bestParameters[0]],
    [2, bestParameters[1]],
    [3, bestParameters[2]],
    [4, bestParameters[3]],
  ])
  const smoothedInitialStability = smoothAndFill(
    optimizedInitialStability,
    initialRatingCount
  )
  return [...smoothedInitialStability, ...bestParameters.slice(4)]
}

export async function computeParameters(
  trainSet: readonly FSRSItemLike[],
  options: ComputeParametersOptions = {}
): Promise<number[]> {
  return optimizeParameters(trainSet, options, 'compute')
}

export async function benchmarkParameters(
  trainSet: readonly FSRSItemLike[],
  options: ComputeParametersOptions = {}
): Promise<number[]> {
  return optimizeParameters(trainSet, options, 'benchmark')
}
