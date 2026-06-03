import { FSRSValidationError } from '../../error.js'
import { clamp, roundTo } from '../../help.js'
import type { ModelBounds } from '../../kit/types.js'
import { type FSRSState, type Grade, Rating } from '../../models.js'
import { FSRS5_DECAY, FSRS5_FACTOR } from './constants.js'

export function forgetting_curve(
  elapsed_days: number,
  stability: number
): number {
  return roundTo(
    Math.pow(1 + (FSRS5_FACTOR * elapsed_days) / stability, FSRS5_DECAY),
    8
  )
}

/**
 * @see https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm#fsrs-5
 */
export class FSRS5Algorithm {
  constructor(
    private weights: number[],
    private enableShortTerm: boolean,
    private bounds: ModelBounds
  ) {
    if (!Array.isArray(weights) || weights.length !== 19) {
      throw new FSRSValidationError(
        `FSRS5Algorithm requires exactly 19 weights, but received ${weights?.length}`
      )
    }
  }

  init_stability(g: Grade): number {
    return Math.max(this.weights[g - 1], 0.1)
  }

  init_difficulty(g: Grade): number {
    const w = this.weights
    const d = w[4] - Math.exp((g - 1) * w[5]) + 1
    return clamp(roundTo(d, 8), this.bounds.dMin, this.bounds.dMax)
  }

  next_interval(s: number, desired_retention: number): number {
    if (
      !Number.isFinite(desired_retention) ||
      desired_retention <= 0 ||
      desired_retention > 1
    ) {
      throw new FSRSValidationError(
        'Requested retention rate should be in the range (0,1]'
      )
    }
    const intervalModifier = roundTo(
      (Math.pow(desired_retention, 1 / FSRS5_DECAY) - 1) / FSRS5_FACTOR,
      8
    )
    return Math.max(Math.round(s * intervalModifier), 1)
  }

  /**
   * @see https://github.com/open-spaced-repetition/fsrs4anki/issues/697
   */
  linear_damping(delta_d: number, old_d: number): number {
    return roundTo((delta_d * (10 - old_d)) / 9, 8)
  }

  next_difficulty(d: number, g: Grade): number {
    const delta_d = -this.weights[6] * (g - 3)
    const next_d = d + this.linear_damping(delta_d, d)
    return clamp(
      this.mean_reversion(this.init_difficulty(Rating.Easy), next_d),
      this.bounds.dMin,
      this.bounds.dMax
    )
  }

  mean_reversion(init: number, current: number): number {
    const w = this.weights
    return roundTo(w[7] * init + (1 - w[7]) * current, 8)
  }

  next_recall_stability(d: number, s: number, r: number, g: Grade): number {
    const w = this.weights
    const hard_penalty = Rating.Hard === g ? w[15] : 1
    const easy_bound = Rating.Easy === g ? w[16] : 1
    return roundTo(
      clamp(
        s *
          (1 +
            Math.exp(w[8]) *
              (11 - d) *
              Math.pow(s, -w[9]) *
              (Math.exp((1 - r) * w[10]) - 1) *
              hard_penalty *
              easy_bound),
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
        w[11] *
          Math.pow(d, -w[12]) *
          (Math.pow(s + 1, w[13]) - 1) *
          Math.exp((1 - r) * w[14]),
        this.bounds.sMin,
        this.bounds.sMax
      ),
      8
    )
  }

  next_short_term_stability(s: number, g: Grade): number {
    const w = this.weights
    return roundTo(
      clamp(
        s * Math.exp(w[17] * (g - 3 + w[18])),
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
    if (g === 0) {
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
    r = typeof r === 'number' ? r : this.forgetting_curve(t, s)
    let new_s: number
    if (t === 0 && this.enableShortTerm) {
      new_s = this.next_short_term_stability(s, g)
    } else if (g === Rating.Again) {
      const s_after_fail = this.next_forget_stability(d, s, r)
      let [w_17, w_18] = [0, 0]
      if (this.enableShortTerm) {
        w_17 = this.weights[17]
        w_18 = this.weights[18]
      }
      const next_s_min = s / Math.exp(w_17 * w_18)
      new_s = clamp(roundTo(next_s_min, 8), this.bounds.sMin, s_after_fail)
    } else {
      new_s = this.next_recall_stability(d, s, r, g)
    }

    const new_d = this.next_difficulty(d, g)
    return { difficulty: new_d, stability: new_s }
  }
}
