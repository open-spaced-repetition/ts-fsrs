import type * as tf from '@tensorflow/tfjs';
import { FSRSAlgorithm as GenericFSRSAlgorithm } from './algorithm_generic';
import { TfMath } from './math';
import { TypeConvert } from './convert';
import { CLAMP_PARAMETERS, default_w } from './constant';
import { clipParameters, createEmptyCard, generatorParameters, migrateParameters } from './default';
import { FSRS } from './fsrs';
import {
  type FSRSHistory,
  type FSRSParameters,
  Rating,
  type Grade,
} from './models';

// Define an internal type for clarity and type safety during processing
type ReviewLogWithCardId = FSRSHistory & { card_id?: string | number };

/**
 * Options for configuring the TensorFlow.js backend.
 */
export type OptimizerFactoryOptions = {
  backend?: 'cpu' | 'webgl' | 'wasm' | 'node';
};

/**
 * Hyperparameters for the parameter optimization process.
 */
export interface OptimizerOptions {
  learningRate?: number;
  epochs?: number;
  batchSize?: number;
  maxSequenceLength?: number;
}

/**
 * Statistical patterns of user behavior extracted from review logs.
 */
export interface ReviewStatistics {
  firstReviewProbs: [number, number, number, number]; // Again, Hard, Good, Easy
  recallProbs: [number, number, number]; // Hard, Good, Easy on recall
  firstReviewAvgDurations: [number, number, number, number];
  recallAvgDurations: [number, number, number, number]; // Includes Again
}

/**
 * Configuration options for the optimal retention simulation.
 */
export interface RetentionOptions {
  simulationDays?: number;
  numCards?: number;
  retentionLevels?: number[];
}

/**
 * FSRS Parameter Optimizer.
 * This class provides static methods to compute optimal FSRS parameters and
 * retention rates from a user's review history.
 */
export class Optimizer {
  private static tfjs: typeof tf;

  /**
   * Asynchronously creates and initializes the Optimizer service.
   * This method dynamically loads TensorFlow.js, making it an optional dependency.
   * It must be called before any other optimizer methods.
   * @param options - Configuration for the TensorFlow.js backend.
   * @returns A promise that resolves to the Optimizer class itself.
   */
  public static async create(options?: OptimizerFactoryOptions): Promise<typeof Optimizer> {
    if (this.tfjs) {
      return Optimizer; // Already initialized
    }

    try {
      if (typeof process !== 'undefined' && process.release?.name === 'node') {
        this.tfjs = await import('@tensorflow/tfjs-node');
      } else {
        this.tfjs = await import('@tensorflow/tfjs');
      }
    } catch (e) {
      console.error('FSRS Optimizer Error:', e);
      throw new Error('Failed to load TensorFlow.js. Please install it via `npm install @tensorflow/tfjs` (for browsers) or `npm install @tensorflow/tfjs-node` (for Node.js)');
    }

    if (options?.backend) {
      await this.tfjs.setBackend(options.backend);
    }

    return Optimizer;
  }

  /**
   * Computes optimal FSRS parameters from a user's review history using gradient descent.
   * @param review_logs - An array of the user's review history.
   * @param initial_w - (Optional) Initial weights to start optimization from. Defaults to FSRS defaults.
   * @param options - (Optional) Hyperparameters for the optimization process.
   * @param schedulerParams - (Optional) The user's scheduler parameters (e.g., relearning steps) to ensure accurate parameter clamping.
   * @returns A promise that resolves to an array of 21 optimized FSRS parameters.
   */
  public static async computeOptimalParameters(
    review_logs: ReviewLogWithCardId[],
    initial_w?: number[],
    options: OptimizerOptions = {},
    schedulerParams: Partial<FSRSParameters> = {}
  ): Promise<number[]> {
    if (!this.tfjs) {
      throw new Error('Optimizer not initialized. Call Optimizer.create() first.');
    }

    const {
      learningRate = 4e-2,
      epochs = 5,
      batchSize = 512,
      maxSequenceLength = 64,
    } = options;

    const cardSequences = this.preprocessReviewLogs(review_logs, maxSequenceLength);

    if (Object.keys(cardSequences).length === 0) {
      console.warn('No valid sequences found in review logs. Returning initial parameters.');
      return initial_w || [...default_w];
    }

    const numReviews = this.countValidReviews(cardSequences);
    if (numReviews < batchSize) {
      console.warn(`Insufficient reviews (${numReviews}) for optimization. Need at least ${batchSize}. Returning initial parameters.`);
      return initial_w || [...default_w];
    }

    const fsrsParams = generatorParameters(schedulerParams);
    const baseW = initial_w || fsrsParams.w;
    const w = clipParameters(migrateParameters(baseW), fsrsParams.relearning_steps.length);
    const params = this.tfjs.variable(this.tfjs.tensor1d(w));

    const adam = this.tfjs.train.adam(learningRate);
    const lossHistory: number[] = [];

    for (let epoch = 0; epoch < epochs; epoch++) {
      const cardIds = Object.keys(cardSequences);
      this.shuffleArray(cardIds);

      let epochLoss = 0;
      let batchCount = 0;
      const tfMath = new TfMath(this.tfjs);

      for (let batchStart = 0; batchStart < cardIds.length; batchStart += batchSize) {
        const batchIds = cardIds.slice(batchStart, batchStart + batchSize);
        
        const lossTensor = adam.minimize(() => {
          fsrsParams.w = Array.from(params.dataSync());
          return this.computeBatchLoss(batchIds, cardSequences, fsrsParams, tfMath) as tf.Scalar;
        }, true, [params]);

        if (lossTensor) {
          epochLoss += lossTensor.dataSync()[0];
          lossTensor.dispose();
        }

        this.clampParameters(params, fsrsParams);
        batchCount++;
      }

      const avgLoss = epochLoss / batchCount;
      lossHistory.push(avgLoss);
      console.log(`Epoch ${epoch + 1}/${epochs}, Loss: ${avgLoss.toFixed(6)}`);
    }

    const finalParams = Array.from(params.dataSync());
    params.dispose();
    adam.dispose();

    return finalParams;
  }

  /**
   * Analyzes review logs to extract statistical patterns of user behavior.
   * @param review_logs - An array of the user's review history.
   * @returns An object containing probabilities and average review times.
   */
  public static analyzeReviewLogs(review_logs: ReviewLogWithCardId[]): ReviewStatistics {
    if (review_logs.length < 10) {
      throw new Error('Insufficient review logs for analysis. Need at least 10 reviews.');
    }

    const sortedReviews = review_logs
      .filter(r => r.rating !== Rating.Manual)
      .sort((a, b) => {
        const cardIdA = a.card_id || 0;
        const cardIdB = b.card_id || 0;
        const cardDiff = (typeof cardIdA === 'string' || typeof cardIdB === 'string')
          ? String(cardIdA).localeCompare(String(cardIdB))
          : cardIdA - cardIdB;
        if (cardDiff !== 0) return cardDiff;
        return new Date(a.review).getTime() - new Date(b.review).getTime();
      });

    const cardGroups = new Map<string | number, FSRSHistory[]>();
    for (const review of sortedReviews) {
      const cardId = review.card_id || 'unknown';
      if (!cardGroups.has(cardId)) cardGroups.set(cardId, []);
      cardGroups.get(cardId)!.push(review);
    }

    const firstReviews = Array.from(cardGroups.values()).map(reviews => reviews[0]);
    const firstReviewCounts = [0, 0, 0, 0];
    const firstReviewDurations: number[][] = [[], [], [], []];

    for (const review of firstReviews) {
      const ratingIndex = review.rating - 1;
      firstReviewCounts[ratingIndex]++;
      if (review.review_duration !== undefined && review.review_duration !== null) {
        firstReviewDurations[ratingIndex].push(review.review_duration);
      }
    }

    const recallReviews = Array.from(cardGroups.values()).flatMap(reviews => reviews.slice(1));
    const recallCounts = [0, 0, 0]; // Hard, Good, Easy
    const recallDurations: number[][] = [[], [], [], []]; // Again, Hard, Good, Easy

    for (const review of recallReviews) {
      if (review.rating !== Rating.Again) {
        recallCounts[review.rating - 2]++;
      }
      if (review.review_duration !== undefined && review.review_duration !== null) {
        recallDurations[review.rating - 1].push(review.review_duration);
      }
    }

    const totalFirst = firstReviewCounts.reduce((sum, count) => sum + count, 0);
    const totalRecall = recallCounts.reduce((sum, count) => sum + count, 0);

    if (totalFirst === 0) throw new Error("Cannot compute statistics: no first reviews found.");

    return {
      firstReviewProbs: firstReviewCounts.map(c => c / totalFirst) as [number, number, number, number],
      recallProbs: totalRecall > 0 ? recallCounts.map(c => c / totalRecall) as [number, number, number] : [1/3, 1/3, 1/3],
      firstReviewAvgDurations: firstReviewDurations.map(this.average) as [number, number, number, number],
      recallAvgDurations: recallDurations.map(this.average) as [number, number, number, number],
    };
  }

  /**
   * Computes the optimal retention rate by simulating review costs.
   * @param stats - The user behavior statistics from `analyzeReviewLogs`.
   * @param parameters - The optimized FSRS parameters.
   * @param options - (Optional) Configuration for the simulation.
   * @returns The retention rate (e.g., 0.9) that minimizes the estimated total review time.
   */
  public static computeOptimalRetention(
    stats: ReviewStatistics,
    parameters: number[],
    options: RetentionOptions = {}
  ): number {
    const {
      simulationDays = 365,
      numCards = 1000,
      retentionLevels = [0.7, 0.75, 0.8, 0.85, 0.9, 0.95],
    } = options;

    const costs = retentionLevels.map(retention =>
      this.simulateReviewCost(stats, parameters, retention, simulationDays, numCards)
    );

    const minCostIndex = costs.indexOf(Math.min(...costs));
    return retentionLevels[minCostIndex];
  }

  private static preprocessReviewLogs(
    review_logs: ReviewLogWithCardId[],
    maxSequenceLength: number
  ): Record<string, Array<{ review: Date; rating: Grade; recall: number }>> {
    const sequences: Record<string, Array<{ review: Date; rating: Grade; recall: number }>> = {};

    for (const log of review_logs) {
      if (log.rating === Rating.Manual) continue;

      const cardId = String(log.card_id || 'unknown');
      const reviewDate = TypeConvert.time(log.review);
      const recall = log.rating === Rating.Again ? 0 : 1;

      if (!sequences[cardId]) sequences[cardId] = [];
      sequences[cardId].push({ review: reviewDate, rating: log.rating, recall });
    }

    for (const cardId in sequences) {
      sequences[cardId].sort((a, b) => a.review.getTime() - b.review.getTime());
      if (sequences[cardId].length > maxSequenceLength) {
        sequences[cardId] = sequences[cardId].slice(0, maxSequenceLength);
      }
    }

    return sequences;
  }

  private static countValidReviews(sequences: Record<string, Array<any>>): number {
    let count = 0;
    for (const sequence of Object.values(sequences)) {
      for (let i = 1; i < sequence.length; i++) {
        const prevReview = sequence[i - 1].review;
        const currReview = sequence[i].review;
        const daysDiff = Math.floor((currReview.getTime() - prevReview.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff > 0) count++;
      }
    }
    return count;
  }

  private static computeBatchLoss(
    cardIds: string[],
    sequences: Record<string, Array<{ review: Date; rating: Grade; recall: number }>>,
    fsrsParams: FSRSParameters,
    tfMath: TfMath
  ): tf.Tensor {
    return this.tfjs.tidy(() => {
      const losses: tf.Tensor[] = [];
      const algorithm = new GenericFSRSAlgorithm(fsrsParams, tfMath);

      for (const cardId of cardIds) {
        const sequence = sequences[cardId];
        if (!sequence || sequence.length < 2) continue;

        let s: tf.Tensor = algorithm.init_stability(sequence[0].rating);
        let d: tf.Tensor = algorithm.init_difficulty(sequence[0].rating);
        let last_review: Date = sequence[0].review;

        for (let i = 1; i < sequence.length; i++) {
          const review = sequence[i];
          const elapsedDays = Math.max(0, Math.floor((review.review.getTime() - last_review.getTime()) / (1000 * 60 * 60 * 24)));

          if (elapsedDays > 0) {
            const r = algorithm.forgetting_curve(elapsedDays, s);
            const target = tfMath.toTensor(review.recall);
            const loss = this.tfjs.losses.sigmoidCrossEntropy(target, r);
            losses.push(loss);
          }

          const updatedState = algorithm.next_state(s, d, review.rating, elapsedDays);
          s = updatedState.stability;
          d = updatedState.difficulty;

          last_review = review.review;
        }
      }

      if (losses.length === 0) return this.tfjs.scalar(0);
      return this.tfjs.mean(this.tfjs.stack(losses));
    });
  }

  private static clampParameters(params: tf.Variable, fsrsParams: FSRSParameters): void {
    this.tfjs.tidy(() => {
      const clipRanges = CLAMP_PARAMETERS(fsrsParams.relearning_steps.length > 1 ? 2.0 : 0); // Simplified logic, can be enhanced
      const lowerBounds = clipRanges.map(r => r[0]);
      const upperBounds = clipRanges.map(r => r[1]);

      const lowerTensor = this.tfjs.tensor1d(lowerBounds);
      const upperTensor = this.tfjs.tensor1d(upperBounds);

      const clipped = this.tfjs.minimum(this.tfjs.maximum(params, lowerTensor), upperTensor);
    });
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
      enable_fuzz: false,
    });

    let totalCost = 0;

    for (let i = 0; i < numCards; i++) {
      let card = createEmptyCard(new Date(2025, 0, 1));
      let currentDate = new Date(2025, 0, 1);
      const endDate = new Date(currentDate.getTime() + simulationDays * 24 * 60 * 60 * 1000);

      while (currentDate < endDate) {
        const isFirstReview = card.reps === 0;
        let rating: Grade;
        let duration: number;

        if (isFirstReview) {
          const sampledRating = this.sampleRating(stats.firstReviewProbs, [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]);
          duration = this.getAverageDuration(stats, sampledRating, true);
          rating = sampledRating;
        } else {
          const isRecall = Math.random() < retention;
          if (isRecall) {
            rating = this.sampleRating(stats.recallProbs, [Rating.Hard, Rating.Good, Rating.Easy]);
          } else {
            rating = Rating.Again;
          }
          duration = this.getAverageDuration(stats, rating, false);
        }
        
        totalCost += duration;

        const result = fsrs.next(card, currentDate, rating);
        card = result.card;
        currentDate = card.due;
      }
    }

    const totalKnowledge = retention * numCards;
    return totalKnowledge > 0 ? totalCost / totalKnowledge : Infinity;
  }

  private static sampleRating<R extends Rating>(probs: number[], ratings: R[]): R {
    const rand = Math.random();
    let cumProb = 0;

    for (let i = 0; i < probs.length; i++) {
      cumProb += probs[i];
      if (rand <= cumProb) return ratings[i];
    }

    return ratings[ratings.length - 1];
  }

  private static getAverageDuration(stats: ReviewStatistics, rating: Rating, isFirst: boolean): number {
    const durations = isFirst ? stats.firstReviewAvgDurations : stats.recallAvgDurations;
    return durations[rating - 1] || 0;
  }

  private static average = (arr: number[]) => arr.length > 0 ? arr.reduce((sum, val) => sum + val, 0) / arr.length : 0;
  private static shuffleArray = <T>(array: T[]) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  };
}
