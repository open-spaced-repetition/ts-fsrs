import type * as tf from '@tensorflow/tfjs'
import { FSRSAlgorithm } from './algorithm_generic'
import { IMath } from './math'
import { TypeConvert } from './convert'
import { createEmptyCard } from './default'
import { FSRS } from './fsrs'
import {
    type FSRSHistory,
    type FSRSParameters, Rating
} from './models'

export type OptimizerFactoryOptions = {
  backend?: 'cpu' | 'webgl' | 'wasm' | 'node'
}

export interface OptimizerOptions {
  learningRate?: number
  epochs?: number
  batchSize?: number
  maxSequenceLength?: number
}

export interface ReviewStatistics {
  firstReviewProbs: [number, number, number, number] // Again, Hard, Good, Easy
  recallProbs: [number, number, number] // Hard, Good, Easy on recall
  firstReviewAvgDurations: [number, number, number, number]
  recallAvgDurations: [number, number, number, number] // Includes Again
}

export interface RetentionOptions {
  simulationDays?: number
  numCards?: number
  retentionLevels?: number[]
}

/**
 * TensorFlow.js Math implementation for tensor operations
 */
class TfMath implements IMath<tf.Tensor> {
  constructor(private tfjs: typeof tf) {}

  add(a: tf.Tensor, b: tf.Tensor | number): tf.Tensor {
    return this.tfjs.add(a, b)
  }

  sub(a: tf.Tensor, b: tf.Tensor | number): tf.Tensor {
    return this.tfjs.sub(a, b)
  }

  mul(a: tf.Tensor, b: tf.Tensor | number): tf.Tensor {
    return this.tfjs.mul(a, b)
  }

  div(a: tf.Tensor, b: tf.Tensor | number): tf.Tensor {
    return this.tfjs.div(a, b)
  }

  pow(base: tf.Tensor, exp: tf.Tensor | number): tf.Tensor {
    return this.tfjs.pow(base, exp)
  }

  exp(t: tf.Tensor): tf.Tensor {
    return this.tfjs.exp(t)
  }

  log(t: tf.Tensor): tf.Tensor {
    return this.tfjs.log(t)
  }

  max(a: tf.Tensor, b: tf.Tensor | number): tf.Tensor {
    return this.tfjs.maximum(a, b)
  }

  min(a: tf.Tensor, b: tf.Tensor | number): tf.Tensor {
    return this.tfjs.minimum(a, b)
  }

  clip(val: tf.Tensor, min: number, max: number): tf.Tensor {
    return this.tfjs.clipByValue(val, min, max)
  }

  toTensor(n: number): tf.Tensor {
    return this.tfjs.scalar(n)
  }

  toTensorArray(arr: number[] | readonly number[]): tf.Tensor[] {
    return arr.map(n => this.tfjs.scalar(n))
  }

  toNumber(t: tf.Tensor): number {
    return t.dataSync()[0]
  }

  toNumberArray(arr: tf.Tensor[]): number[] {
    return arr.map(t => this.toNumber(t))
  }
}

/**
 * FSRS Parameter Optimizer
 */
export class Optimizer {
  private static tfjs: typeof tf

  /**
   * Factory method to create optimizer with TensorFlow.js loading
   */
  public static async create(options?: OptimizerFactoryOptions): Promise<typeof Optimizer> {
    if (this.tfjs) {
      return Optimizer
    }

    try {
      // Intelligently select backend based on environment
      if (typeof process !== 'undefined' && process.release?.name === 'node') {
        this.tfjs = await import('@tensorflow/tfjs-node')
      } else {
        this.tfjs = await import('@tensorflow/tfjs')
      }
    } catch (e) {
      console.error("FSRS Optimizer Error:", e)
      throw new Error('Failed to load TensorFlow.js. Please install it via `npm install @tensorflow/tfjs` (for browsers) or `npm install @tensorflow/tfjs-node` (for Node.js)')
    }

    if (options?.backend) {
      await this.tfjs.setBackend(options.backend)
    }

    return Optimizer
  }

  /**
   * Compute optimal FSRS parameters from review history
   */
  public static async computeOptimalParameters(
    review_logs: FSRSHistory[],
    initial_w?: number[],
    options: OptimizerOptions = {}
  ): Promise<number[]> {
    if (!this.tfjs) {
      throw new Error('Optimizer not initialized. Call Optimizer.create() first.')
    }

    const {
      learningRate = 4e-2,
      epochs = 5,
      batchSize = 512,
      maxSequenceLength = 64
    } = options

    // Data preprocessing
    const cardSequences = this.preprocessReviewLogs(review_logs, maxSequenceLength)
    
    if (Object.keys(cardSequences).length === 0) {
      console.warn('No valid sequences found in review logs')
      return initial_w || [0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542]
    }

    // Count reviews for scheduler
    const numReviews = this.countValidReviews(cardSequences)
    if (numReviews < batchSize) {
      console.warn(`Insufficient reviews (${numReviews}) for optimization. Need at least ${batchSize}.`)
      return initial_w || [0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542]
    }

    // Initialize parameters
    const defaultW = initial_w || [0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542]
    const params = this.tfjs.variable(this.tfjs.tensor1d(defaultW))

    // Initialize optimizer
    const adam = this.tfjs.train.adam(learningRate)
    const lossHistory: number[] = []

    // Training loop
    for (let epoch = 0; epoch < epochs; epoch++) {
      const cardIds = Object.keys(cardSequences)
      this.shuffleArray(cardIds) // Shuffle for better training

      let epochLoss = 0
      let batchCount = 0

      // EFFICIENCY FIX: Create algorithm instance once per epoch, not per batch
      const tfMath = new TfMath(this.tfjs)
      
      for (let batchStart = 0; batchStart < cardIds.length; batchStart += batchSize) {
        const batchIds = cardIds.slice(batchStart, batchStart + batchSize)
        
        // CORRECTED: adam.minimize computes loss and gradients
        // The function here MUST return the loss tensor
        const lossTensor = await adam.minimize(() => {
          return this.computeBatchLoss(batchIds, cardSequences, params, tfMath)
        }, true /* return an un-disposed loss tensor */)
        
        if (lossTensor) {
          epochLoss += lossTensor.dataSync()[0]
          lossTensor.dispose() // Now we can dispose of it
        }
        
        // Parameter clamping
        this.clampParameters(params)
        
        batchCount++
      }

      const avgLoss = epochLoss / batchCount
      lossHistory.push(avgLoss)
      console.log(`Epoch ${epoch + 1}/${epochs}, Loss: ${avgLoss.toFixed(6)}`)
    }

    // Extract final parameters
    const finalParams = Array.from(params.dataSync())
    
    // Cleanup
    params.dispose()
    adam.dispose()

    return finalParams
  }

  /**
   * Analyze review logs to extract statistical patterns
   */
  public static analyzeReviewLogs(review_logs: FSRSHistory[]): ReviewStatistics {
    if (review_logs.length < 10) {
      throw new Error('Insufficient review logs for analysis. Need at least 10 reviews.')
    }

    // Sort reviews by card and time
    const sortedReviews = review_logs
      .filter(r => r.rating !== Rating.Manual)
      .sort((a, b) => {
        const cardDiff = (a as any).card_id - (b as any).card_id
        if (cardDiff !== 0) return cardDiff
        return new Date(a.review).getTime() - new Date(b.review).getTime()
      })

    // Group by card ID
    const cardGroups = new Map<string, FSRSHistory[]>()
    for (const review of sortedReviews) {
      const cardId = (review as any).card_id || 'unknown'
      if (!cardGroups.has(cardId)) {
        cardGroups.set(cardId, [])
      }
      cardGroups.get(cardId)!.push(review)
    }

    // Analyze first reviews
    const firstReviews = Array.from(cardGroups.values()).map(reviews => reviews[0])
    const firstReviewCounts = [0, 0, 0, 0] // Again, Hard, Good, Easy
    const firstReviewDurations = [[] as number[], [] as number[], [] as number[], [] as number[]]

    for (const review of firstReviews) {
      const ratingIndex = review.rating - 1
      firstReviewCounts[ratingIndex]++
      
      if (review.review_duration !== undefined) {
        firstReviewDurations[ratingIndex].push(review.review_duration)
      }
    }

    // Analyze recall reviews (non-first, non-again)
    const recallReviews = Array.from(cardGroups.values())
      .flatMap(reviews => reviews.slice(1))
      .filter(review => review.rating !== Rating.Again)

    const recallCounts = [0, 0, 0] // Hard, Good, Easy
    const recallDurations = [[] as number[], [] as number[], [] as number[], [] as number[]]

    for (const review of recallReviews) {
      const ratingIndex = review.rating - 2 // Hard=0, Good=1, Easy=2
      if (ratingIndex >= 0) {
        recallCounts[ratingIndex]++
      }
      
      if (review.review_duration !== undefined) {
        recallDurations[review.rating - 1].push(review.review_duration)
      }
    }

    // Calculate probabilities and averages
    const totalFirst = firstReviewCounts.reduce((sum, count) => sum + count, 0)
    const totalRecall = recallCounts.reduce((sum, count) => sum + count, 0)

    const firstReviewProbs: [number, number, number, number] = [
      firstReviewCounts[0] / totalFirst,
      firstReviewCounts[1] / totalFirst,
      firstReviewCounts[2] / totalFirst,
      firstReviewCounts[3] / totalFirst
    ]

    const recallProbs: [number, number, number] = [
      recallCounts[0] / totalRecall,
      recallCounts[1] / totalRecall,
      recallCounts[2] / totalRecall
    ]

    const firstReviewAvgDurations: [number, number, number, number] = [
      this.average(firstReviewDurations[0]),
      this.average(firstReviewDurations[1]),
      this.average(firstReviewDurations[2]),
      this.average(firstReviewDurations[3])
    ]

    const recallAvgDurations: [number, number, number, number] = [
      this.average(recallDurations[0]),
      this.average(recallDurations[1]),
      this.average(recallDurations[2]),
      this.average(recallDurations[3])
    ]

    return {
      firstReviewProbs,
      recallProbs,
      firstReviewAvgDurations,
      recallAvgDurations
    }
  }

  /**
   * Compute optimal retention rate based on review statistics
   */
  public static computeOptimalRetention(
    stats: ReviewStatistics,
    parameters: number[],
    options: RetentionOptions = {}
  ): number {
    const {
      simulationDays = 365,
      numCards = 1000,
      retentionLevels = [0.7, 0.75, 0.8, 0.85, 0.9, 0.95]
    } = options

    const costs = retentionLevels.map(retention => 
      this.simulateReviewCost(stats, parameters, retention, simulationDays, numCards)
    )

    const minCostIndex = costs.indexOf(Math.min(...costs))
    return retentionLevels[minCostIndex]
  }

  // Helper methods
  private static preprocessReviewLogs(
    review_logs: FSRSHistory[], 
    maxSequenceLength: number
  ): Record<string, Array<{ review: Date, rating: number, recall: number }>> {
    const sequences: Record<string, Array<{ review: Date, rating: number, recall: number }>> = {}
    
    for (const log of review_logs) {
      if (log.rating === Rating.Manual) continue
      
      const cardId = (log as any).card_id || 'unknown'
      const reviewDate = TypeConvert.time(log.review)
      const recall = log.rating === Rating.Again ? 0 : 1
      
      if (!sequences[cardId]) {
        sequences[cardId] = []
      }
      
      sequences[cardId].push({
        review: reviewDate,
        rating: log.rating,
        recall
      })
    }

    // Sort sequences by time and truncate to max length
    for (const cardId in sequences) {
      sequences[cardId].sort((a, b) => a.review.getTime() - b.review.getTime())
      sequences[cardId] = sequences[cardId].slice(0, maxSequenceLength)
    }

    return sequences
  }

  private static countValidReviews(sequences: Record<string, Array<any>>): number {
    let count = 0
    for (const sequence of Object.values(sequences)) {
      for (let i = 1; i < sequence.length; i++) {
        const prevReview = sequence[i - 1].review
        const currReview = sequence[i].review
        const daysDiff = Math.floor((currReview.getTime() - prevReview.getTime()) / (1000 * 60 * 60 * 24))
        if (daysDiff > 0) {
          count++
        }
      }
    }
    return count
  }

  private static computeBatchLoss(
    cardIds: string[],
    sequences: Record<string, Array<{ review: Date, rating: number, recall: number }>>,
    params: tf.Variable,
    tfMath: TfMath  // EFFICIENCY FIX: Pass pre-created tfMath instance
  ): tf.Tensor {
    // Wrap entire computation in tf.tidy for automatic memory management
    return this.tfjs.tidy(() => {
      const losses: tf.Tensor[] = []

      // EFFICIENCY FIX: Use pre-created tfMath instance instead of creating algorithm every time
      const mockParams: FSRSParameters = {
        w: Array.from(params.dataSync()),
        request_retention: 0.9,
        maximum_interval: 36500,
        enable_fuzz: false,
        enable_short_term: true,
        learning_steps: [],
        relearning_steps: []
      }
      const algorithm = new FSRSAlgorithm(mockParams, tfMath)

      for (const cardId of cardIds) {
        const sequence = sequences[cardId]
        if (!sequence || sequence.length < 2) continue

        // Initialize state AS TENSORS for the entire sequence
        let s: tf.Tensor = algorithm.init_stability(sequence[0].rating)
        let d: tf.Tensor = algorithm.init_difficulty(sequence[0].rating)
        let last_review: Date = sequence[0].review

        for (let i = 1; i < sequence.length; i++) {
          const review = sequence[i]
          const elapsedDays = Math.max(0, 
            Math.floor((review.review.getTime() - last_review.getTime()) / (1000 * 60 * 60 * 24))
          )

          if (elapsedDays > 0) {
            // Calculate predicted retrievability (keeping as tensor)
            const r = algorithm.forgetting_curve(elapsedDays, s)
            const target = tfMath.toTensor(review.recall)
            
            // CRITICAL FIX: Use binaryCrossentropy instead of sigmoidCrossEntropy
            // since r is already the retrievability (probability), not a logit
            const loss = this.tfjs.losses.binaryCrossentropy(target, r)
            losses.push(loss)
          }

          // Update state, keeping them as tensors throughout the sequence
          const r_for_update = algorithm.forgetting_curve(elapsedDays, s)
          d = algorithm.next_difficulty(d, review.rating)
          
          // SIMPLIFIED: Use unified next_stability method that handles recall vs forget internally
          // This mirrors the structure of the original algorithm and is much cleaner
          s = algorithm.next_stability(d, s, r_for_update, review.rating)
          
          last_review = review.review
        }
      }

      if (losses.length === 0) {
        return this.tfjs.scalar(0)
      }

      // Calculate mean loss - all tensors are automatically cleaned up by tidy
      return this.tfjs.mean(this.tfjs.stack(losses))
    })
  }

  private static clampParameters(params: tf.Variable): void {
    // Wrap in tf.tidy to automatically clean up temporary tensors
    this.tfjs.tidy(() => {
      const lowerBounds = [0.001, 0.001, 0.001, 0.001, 1.0, 0.001, 0.001, 0.001, 0.0, 0.0, 0.001, 0.001, 0.001, 0.001, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.1]
      const upperBounds = [100.0, 100.0, 100.0, 100.0, 10.0, 4.0, 4.0, 0.75, 4.5, 0.8, 3.5, 5.0, 0.25, 0.9, 4.0, 1.0, 6.0, 2.0, 2.0, 0.8, 0.8]
      
      const lowerTensor = this.tfjs.tensor1d(lowerBounds)
      const upperTensor = this.tfjs.tensor1d(upperBounds)
      
      const clampedParams = this.tfjs.clipByValue(params, lowerTensor, upperTensor)
      params.assign(clampedParams)
      
      // All tensors (lowerTensor, upperTensor, clampedParams) are automatically cleaned up by tidy
    })
  }

  private static simulateReviewCost(
    stats: ReviewStatistics,
    parameters: number[],
    retention: number,
    simulationDays: number,
    numCards: number
  ): number {
    const fsrs = new FSRS({ 
      w: parameters, 
      request_retention: retention,
      enable_fuzz: false 
    })

    let totalCost = 0
    
    for (let i = 0; i < numCards; i++) {
      let card = createEmptyCard(new Date(2025, 0, 1))
      let currentDate = new Date(2025, 0, 1)
      const endDate = new Date(2025, 0, 1 + simulationDays)
      
      while (currentDate < endDate) {
        // Simulate review
        const isRecall = Math.random() < retention
        const rating = isRecall 
          ? this.sampleRating(stats.recallProbs, [Rating.Hard, Rating.Good, Rating.Easy])
          : Rating.Again
        
        // Add review cost
        const avgDuration = this.getAverageDuration(stats, rating, card.reps === 0)
        totalCost += avgDuration
        
        // Update card
        const result = fsrs.next(card, currentDate, rating)
        card = result.card
        currentDate = card.due
      }
    }

    return totalCost / (retention * numCards)
  }

  private static sampleRating(probs: number[], ratings: number[]): number {
    const rand = Math.random()
    let cumProb = 0
    
    for (let i = 0; i < probs.length; i++) {
      cumProb += probs[i]
      if (rand <= cumProb) {
        return ratings[i]
      }
    }
    
    return ratings[ratings.length - 1]
  }

  private static getAverageDuration(
    stats: ReviewStatistics, 
    rating: number, 
    isFirst: boolean
  ): number {
    const durations = isFirst ? stats.firstReviewAvgDurations : stats.recallAvgDurations
    return durations[rating - 1] || 0
  }

  private static average(arr: number[]): number {
    return arr.length > 0 ? arr.reduce((sum, val) => sum + val, 0) / arr.length : 0
  }

  private static shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]
    }
  }
}