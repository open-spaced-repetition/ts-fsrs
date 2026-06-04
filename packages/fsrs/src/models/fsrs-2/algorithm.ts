import { FSRSValidationError } from '../../error.js'
import { clamp, roundTo } from '../../help.js'
import type { ModelBounds } from '../../kit/types.js'
import { type FSRSState, type Grade, Rating } from '../../models.js'

export function forgetting_curve(
  elapsed_days: number,
  stability: number
): number {
  return roundTo(Math.pow(0.9, elapsed_days / stability), 8)
}

/**
 * @see https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm#fsrs-v2
 */
export class FSRS2Algorithm {
  constructor(
    private weights: number[],
    private bounds: ModelBounds
  ) {
    if (!Array.isArray(weights) || weights.length !== 14) {
      throw new FSRSValidationError(
        `FSRS2Algorithm requires exactly 14 weights, but received ${weights?.length}`
      )
    }
  }

  init_stability(g: Grade): number {
    const w = this.weights
    return roundTo(
      clamp(w[0] * (w[1] * (g - 1) + 1), this.bounds.sMin, this.bounds.sMax),
      8
    )
  }

  init_difficulty(g: Grade): number {
    const w = this.weights
    return roundTo(
      clamp(w[2] * (w[3] * (g - 4) + 1), this.bounds.dMin, this.bounds.dMax),
      8
    )
  }

  next_interval(s: number, desired_retention: number): number {
    if (
      !Number.isFinite(desired_retention) ||
      desired_retention <= 0 ||
      desired_retention > 1
    ) {
      throw new FSRSValidationError(
        'Desired retention rate should be in the range (0,1]'
      )
    }
    return Math.max(
      Math.round((s * Math.log(desired_retention)) / Math.log(0.9)),
      1
    )
  }

  mean_reversion(init: number, current: number): number {
    const w = this.weights
    return roundTo(w[5] * init + (1 - w[5]) * current, 8)
  }

  next_difficulty(d: number, g: Grade): number {
    const w = this.weights
    const next_d = d + w[4] * (g - 3)
    const init_d_good = w[2] * (-w[3] + 1)
    return roundTo(
      clamp(
        this.mean_reversion(init_d_good, next_d),
        this.bounds.dMin,
        this.bounds.dMax
      ),
      8
    )
  }

  next_recall_stability(d: number, s: number, r: number): number {
    const w = this.weights
    return roundTo(
      clamp(
        s *
          (1 +
            Math.exp(w[6]) *
              Math.pow(d, w[7]) *
              Math.pow(s, w[8]) *
              (Math.exp((1 - r) * w[9]) - 1)),
        this.bounds.sMin,
        this.bounds.sMax
      ),
      8
    )
  }

  next_forget_stability(d: number, s: number, r: number): number {
    const w = this.weights
    return roundTo(
      clamp(
        w[10] *
          Math.pow(d, w[11]) *
          Math.pow(s, w[12]) *
          (Math.exp((1 - r) * w[13]) - 1),
        this.bounds.sMin,
        this.bounds.sMax
      ),
      8
    )
  }

  forgetting_curve = forgetting_curve

  next_state(
    memory_state: FSRSState | null,
    t: number,
    g: number,
    r?: number
  ): FSRSState {
    const { difficulty: d, stability: s } = memory_state ?? {
      difficulty: 0,
      stability: 0,
    }
    if (t < 0) {
      throw new FSRSValidationError(`Invalid delta_t "${t}"`)
    }
    if (g < 0 || g > 4) {
      throw new FSRSValidationError(`Invalid grade "${g}"`)
    }
    if (d === 0 && s === 0) {
      return {
        difficulty: this.init_difficulty(g),
        stability: this.init_stability(g),
      }
    }
    if (g === Rating.Manual) {
      return {
        difficulty: d,
        stability: s,
      }
    }
    if (d < this.bounds.dMin || s < this.bounds.sMin) {
      throw new FSRSValidationError(
        `Invalid memory state { difficulty: ${d}, stability: ${s} }`
      )
    }
    const retrievability =
      typeof r === 'number' ? r : this.forgetting_curve(t, s)
    const new_d = this.next_difficulty(d, g)
    const new_s =
      g === Rating.Again
        ? this.next_forget_stability(new_d, s, retrievability)
        : this.next_recall_stability(new_d, s, retrievability)
    return { difficulty: new_d, stability: new_s }
  }
}
