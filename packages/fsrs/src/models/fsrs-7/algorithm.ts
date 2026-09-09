import { type Grade, Rating } from '@open-spaced-repetition/srs-kit'
import type { ModelBounds } from '@open-spaced-repetition/srs-kit/model'
import { FSRSValidationError } from '@/error.js'
import { clamp, roundTo } from '@/help.js'
import { DR_MAX, DR_MIN, LOG_MIN_T, MIN_T } from './constants.js'
import type { FSRS7State } from './schema.js'

/** Dual-trace FSRS-7, ported from fsrs-rs model_v7.rs. Times are fractional days; callers validate inputs. */
export class FSRS7Algorithm {
  private readonly logSMax: number

  constructor(
    private readonly weights: readonly number[],
    private readonly bounds: ModelBounds<FSRS7State>
  ) {
    if (
      !Array.isArray(weights) ||
      weights.length !== 34 ||
      !weights.every(Number.isFinite)
    ) {
      throw new FSRSValidationError(
        'FSRS7Algorithm requires exactly 34 finite weights'
      )
    }
    this.logSMax = Math.log(bounds.sMax)
  }

  init_stability(grade: Grade): number {
    return clamp(this.weights[grade - 1], this.bounds.sMin, this.bounds.sMax)
  }

  init_difficulty(grade: Grade): number {
    const w = this.weights
    const d = w[4] - Math.exp(w[5] * (grade - 1)) + 1
    return d
  }

  private fast_component(t: number, s: number) {
    const w = this.weights
    // Negative elapsed time would drive `base` below zero and make Math.pow return NaN.
    const days = Math.max(t, 0)
    const decay = -clamp(w[23] * Math.pow(s, w[33] - 0.3), 0.01, 0.95)
    const factor = Math.exp(Math.min(Math.log(w[25]) / decay, 60)) - 1
    const scale = factor / s
    const base = 1 + scale * days
    return {
      recall: Math.pow(base, decay),
      derivative: decay * Math.pow(base, decay - 1) * scale,
    }
  }

  /**
   * Retrievability and its elapsed-day derivative, plus the raw trace recalls
   * and the unnormalised weights mixing them.
   */
  curve(t: number, state: Readonly<FSRS7State>) {
    const { sMin, sMax, stabilityFastMin, stabilityFastMax, dMin, dMax } =
      this.bounds
    const s = clamp(state.stability, sMin, sMax)
    const sFast = clamp(state.stabilityFast, stabilityFastMin, stabilityFastMax)
    const d = clamp(state.difficulty, dMin, dMax)
    return this.compute_curve(t, s, sFast, d)
  }

  /** Computes the curve from memory values already clamped by the caller. */
  private compute_curve(t: number, s: number, sFast: number, d: number) {
    const w = this.weights
    const days = Math.max(t, 0)
    const fast = this.fast_component(days, sFast)
    const decay = -clamp(w[24], 0.01, 0.95)
    const scale =
      ((Math.pow(w[26], 1 / decay) - 1) * Math.exp((d - 5) * (w[32] - 0.3))) / s
    const base = 1 + scale * days
    const slow = Math.pow(base, decay)
    const derivative = decay * Math.pow(base, decay - 1) * scale
    const weight1 = w[27] * Math.pow(sFast, -w[29])
    const weight2 =
      w[28] * Math.pow(s, w[30]) * Math.exp((d - 5) * (w[31] - 0.5))
    const total = weight1 + weight2
    return {
      retrievability:
        ((weight1 * fast.recall + weight2 * slow) / total) * (1 - 2e-5) + 1e-5,
      derivative:
        ((weight1 * fast.derivative + weight2 * derivative) / total) *
        (1 - 2e-5),
      fast: fast.recall,
      slow,
      fastWeight: weight1,
      slowWeight: weight2,
    }
  }

  /** Raw fractional days for retention in (0,1); rates >= 0.9999 yield zero. */
  next_interval(state: Readonly<FSRS7State>, desiredRetention: number): number {
    const { sMin, sMax, stabilityFastMin, stabilityFastMax, dMin, dMax } =
      this.bounds
    if (
      !Number.isFinite(desiredRetention) ||
      desiredRetention <= 0 ||
      desiredRetention >= 1
    ) {
      throw new FSRSValidationError(
        'Desired retention rate should be in the range (0,1)'
      )
    }
    const target = clamp(desiredRetention, DR_MIN, DR_MAX)
    if (target >= DR_MAX) return 0

    const s = clamp(state.stability, sMin, sMax)
    const sFast = clamp(state.stabilityFast, stabilityFastMin, stabilityFastMax)
    const d = clamp(state.difficulty, dMin, dMax)
    const maxStability = Math.max(s, sFast)
    let logT = Math.log(maxStability)
    for (let i = 0; i < 7; i++) {
      logT = clamp(logT, LOG_MIN_T, this.logSMax)
      const t = clamp(Math.exp(logT), MIN_T, sMax)
      const { retrievability, derivative } = this.compute_curve(t, s, sFast, d)
      logT -= clamp(
        (retrievability - target) / Math.min(derivative * t, -1e-12),
        -4,
        4
      )
      if (!Number.isFinite(logT)) break
    }
    const interval = clamp(Math.exp(logT), 0, sMax)
    if (
      Math.abs(
        this.compute_curve(interval, s, sFast, d).retrievability - target
      ) <= 1e-3
    )
      return interval

    // Rust's scalar inference fallback handles saturated or unconverged Newton steps.
    let low = 0
    let high = Math.min(Math.max(maxStability, 1), sMax)
    while (
      this.compute_curve(high, s, sFast, d).retrievability > target &&
      high < sMax
    ) {
      high = Math.min(high * 2, sMax)
    }
    for (let i = 0; i < 50; i++) {
      const mid = (low + high) / 2
      if (this.compute_curve(mid, s, sFast, d).retrievability > target)
        low = mid
      else high = mid
    }
    return (low + high) / 2
  }

  private next_stability(
    s: number,
    d: number,
    r: number,
    grade: Grade,
    start: number
  ): number {
    const w = this.weights
    const fail =
      w[start + 3] *
      (Math.pow(s + 1, w[start + 4]) - 1) *
      Math.exp((1 - r) * w[start + 5])
    const pls = Math.min(s, fail)
    if (grade === Rating.Again) return pls
    const hardPenalty = grade === Rating.Hard ? w[start + 6] : 1
    const easyBonus = grade === Rating.Easy ? w[start + 7] : 1
    const increase =
      Math.exp(w[start] - 1.5) *
        (11 - d) *
        Math.pow(s, -w[start + 1]) *
        (Math.exp((1 - r) * w[start + 2]) - 1) *
        hardPenalty *
        easyBonus +
      1
    return Math.max(pls, s * increase)
  }

  next_state(
    memoryState: Readonly<FSRS7State> | null,
    elapsedDays: number,
    rating: number,
    retrievability?: number
  ): FSRS7State {
    const { sMin, sMax, stabilityFastMin, stabilityFastMax, dMin, dMax } =
      this.bounds
    if (
      !Number.isInteger(rating) ||
      rating < Rating.Manual ||
      rating > Rating.Easy
    ) {
      throw new FSRSValidationError(`Invalid grade "${rating}"`)
    }
    const state =
      memoryState === null
        ? { stability: 0, stabilityFast: 0, difficulty: 0 }
        : memoryState
    if (rating === Rating.Manual) {
      return {
        stability: state.stability,
        stabilityFast: state.stabilityFast,
        difficulty: state.difficulty,
      }
    }
    const grade = rating as Grade
    if (
      state.stability === 0 &&
      state.stabilityFast === 0 &&
      state.difficulty === 0
    ) {
      const stability = this.init_stability(grade)
      return {
        stability: clamp(roundTo(stability, 8), sMin, sMax),
        stabilityFast: clamp(
          roundTo(stability * 0.8, 8),
          stabilityFastMin,
          stabilityFastMax
        ),
        difficulty: clamp(roundTo(this.init_difficulty(grade), 8), dMin, dMax),
      }
    }
    if (state.stability <= 0 || state.stabilityFast <= 0) {
      throw new FSRSValidationError(
        'Invalid FSRS7 memory state: both stabilities must be positive'
      )
    }
    if (
      retrievability !== undefined &&
      (!Number.isFinite(retrievability) ||
        retrievability <= 0 ||
        retrievability >= 1)
    ) {
      throw new FSRSValidationError(
        'Retrievability should be in the range (0,1)'
      )
    }
    const s = clamp(state.stability, sMin, sMax)
    const sFast = clamp(state.stabilityFast, stabilityFastMin, stabilityFastMax)
    const d = clamp(state.difficulty, dMin, dMax)
    const r =
      retrievability ??
      this.compute_curve(elapsedDays, s, sFast, d).retrievability
    const stability = this.next_stability(s, d, r, grade, 7)
    let stabilityFast = this.next_stability(
      sFast,
      d,
      this.fast_component(elapsedDays, sFast).recall,
      grade,
      15
    )
    if (grade === Rating.Again)
      stabilityFast = Math.min(stabilityFast, stability * 0.8)
    let deltaD = -this.weights[6] * (grade - 3)
    if (grade === Rating.Again) deltaD *= r + 0.1
    const difficulty =
      0.01 * this.init_difficulty(Rating.Easy) +
      0.99 * (d + ((10 - d) * deltaD) / 9)
    return {
      stability: clamp(roundTo(stability, 8), sMin, sMax),
      stabilityFast: clamp(
        roundTo(stabilityFast, 8),
        stabilityFastMin,
        stabilityFastMax
      ),
      difficulty: clamp(roundTo(difficulty, 8), dMin, dMax),
    }
  }
}
