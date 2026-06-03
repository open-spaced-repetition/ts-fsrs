import { type Grade, Rating } from '@open-spaced-repetition/srs-kit'
import type { ModelBounds } from '@open-spaced-repetition/srs-kit/model'
import { FSRSValidationError } from '../../error.js'
import { clamp, roundTo } from '../../help.js'
import type { FSRSState } from '../../models.js'

export function forgetting_curve(
  elapsed_days: number,
  stability: number
): number {
  return roundTo(Math.pow(0.9, elapsed_days / stability), 8)
}

/**
 * @see https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm#fsrs-3
 */
export class FSRS3Algorithm {
  constructor(
    private weights: number[],
    private bounds: ModelBounds<FSRSState>
  ) {
    if (!Array.isArray(weights) || weights.length !== 13) {
      throw new FSRSValidationError(
        `FSRS3Algorithm requires exactly 13 weights, but received ${weights?.length}`
      )
    }
  }

  init_stability(g: Grade): number {
    const w = this.weights
    return roundTo(
      clamp(w[0] + (g - 1) * w[1], this.bounds.sMin, this.bounds.sMax),
      8
    )
  }

  init_difficulty(g: Grade): number {
    const w = this.weights
    return roundTo(
      clamp(w[2] + (g - 3) * w[3], this.bounds.dMin, this.bounds.dMax),
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

  next_difficulty(d: number, g: Grade): number {
    const w = this.weights
    const next_d = d + w[4] * (g - 3)
    return roundTo(
      clamp(
        this.mean_reversion(w[2], next_d),
        this.bounds.dMin,
        this.bounds.dMax
      ),
      8
    )
  }

  mean_reversion(init: number, current: number): number {
    const w = this.weights
    return roundTo(w[5] * init + (1 - w[5]) * current, 8)
  }

  next_recall_stability(d: number, s: number, r: number): number {
    const w = this.weights
    return roundTo(
      clamp(
        s *
          (1 +
            Math.exp(w[6]) *
              (11 - d) *
              Math.pow(s, w[7]) *
              (Math.exp((1 - r) * w[8]) - 1)),
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
        w[9] *
          Math.pow(d, w[10]) *
          Math.pow(s, w[11]) *
          Math.exp((1 - r) * w[12]),
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
    if (g === Rating.Manual) {
      return {
        difficulty: d,
        stability: s,
      }
    }
    const grade = g as Grade
    if (d === 0 && s === 0) {
      return {
        difficulty: this.init_difficulty(grade),
        stability: this.init_stability(grade),
      }
    }
    if (d < this.bounds.dMin || s < this.bounds.sMin) {
      throw new FSRSValidationError(
        `Invalid memory state { difficulty: ${d}, stability: ${s} }`
      )
    }
    r = typeof r === 'number' ? r : this.forgetting_curve(t, s)
    const new_d = this.next_difficulty(d, grade)
    const new_s =
      grade === Rating.Again
        ? this.next_forget_stability(new_d, s, r)
        : this.next_recall_stability(new_d, s, r)
    return { difficulty: new_d, stability: new_s }
  }
}
