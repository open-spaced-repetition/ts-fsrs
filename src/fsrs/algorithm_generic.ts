import { IMath, NumberMath } from './math'
import { alea } from './alea'
import { S_MIN } from './constant'
import { clamp, get_fuzz_range } from './help'
import { type FSRSParameters, type Grade, Rating } from './models'
import type { int } from './types'

/**
 * Generic FSRS Algorithm that can work with both numbers and tensors
 */
export class FSRSAlgorithm<T> {
  protected math: IMath<T>
  protected w: T[] // Generic parameters array
  protected _seed?: string
  
  readonly parameters: FSRSParameters

  constructor(params: FSRSParameters, math: IMath<T>) {
    this.math = math
    this.parameters = params
    this.w = this.math.toTensorArray(this.parameters.w)
  }

  set seed(seed: string) {
    this._seed = seed
  }

  /**
   * Initial stability calculation
   * S_0(G) = w_{G-1}
   * S_0 = max(S_0, 0.1)
   */
  init_stability(g: Grade): T {
    const stability = this.w[g - 1]
    return this.math.max(stability, 0.1)
  }

  /**
   * Initial difficulty calculation
   * D_0(G) = w_4 - e^{(G-1) * w_5} + 1
   * D_0 = clamp(D_0, 1, 10)
   */
  init_difficulty(g: Grade): T {
    const exponent = this.math.mul(g - 1, this.w[5])
    const exp_term = this.math.exp(exponent)
    const difficulty = this.math.add(this.math.sub(this.w[4], exp_term), 1)
    return this.math.clip(difficulty, 1, 10)
  }

  /**
   * Forgetting curve calculation
   * R(t,S) = (1 + FACTOR * t/S)^DECAY
   */
  forgetting_curve(elapsed_days: number, stability: T): T {
    // Calculate factor using raw number (for constants)
    const decay_raw = -this.parameters.w[20]
    const factor = Math.exp(Math.pow(decay_raw, -1) * Math.log(0.9)) - 1.0
    
    // CRITICAL FIX: Use raw number for exponent (fixed hyperparameter)
    const decay_exponent = decay_raw  // Fixed hyperparameter
    const term = this.math.mul(factor * elapsed_days, this.math.div(1, stability))
    const base = this.math.add(1, term)
    return this.math.pow(base, decay_exponent)  // base is T, exp is number
  }

  /**
   * Next interval calculation
   */
  next_interval(s: T, intervalModifier: number): T {
    const newInterval = this.math.mul(s, intervalModifier)
    return this.math.clip(newInterval, 1, this.parameters.maximum_interval)
  }

  /**
   * Linear damping for difficulty calculation
   */
  linear_damping(delta_d: T, old_d: T): T {
    const numerator = this.math.mul(delta_d, this.math.sub(10, old_d))
    return this.math.div(numerator, 9)
  }

  /**
   * Mean reversion calculation
   */
  mean_reversion(init: T, current: T): T {
    const term1 = this.math.mul(this.w[7], init)
    const term2 = this.math.mul(this.math.sub(1, this.w[7]), current)
    return this.math.add(term1, term2)
  }

  /**
   * Next difficulty calculation
   * delta_d = -w_6 * (g - 3)
   * next_d = D + linear_damping(delta_d, D)
   * D' = w_7 * D_0(4) + (1 - w_7) * next_d
   */
  next_difficulty(d: T, g: Grade): T {
    const delta_d = this.math.mul(this.w[6], this.math.mul(-1, g - 3))
    const damped_delta = this.linear_damping(delta_d, d)
    const next_d = this.math.add(d, damped_delta)
    const init_easy = this.init_difficulty(Rating.Easy)
    const result = this.mean_reversion(init_easy, next_d)
    return this.math.clip(result, 1, 10)
  }

  /**
   * Next recall stability calculation
   * S'_r(D,S,R,G) = S*(e^{w_8}*(11-D)*S^{-w_9}*(e^{w_10*(1-R)}-1)*hard_penalty*easy_bonus+1)
   */
  next_recall_stability(d: T, s: T, r: T, g: Grade): T {
    const hard_penalty = g === Rating.Hard ? this.w[15] : this.math.toTensor(1)
    const easy_bonus = g === Rating.Easy ? this.w[16] : this.math.toTensor(1)
    
    const term1 = this.math.exp(this.w[8])
    const term2 = this.math.sub(11, d)
    // CRITICAL FIX: Exponent should be raw number, not tensor
    const exponent = -this.parameters.w[9]  // Fixed hyperparameter
    const term3 = this.math.pow(s, exponent)  // base is T, exp is number
    const inner_exp = this.math.mul(this.math.sub(1, r), this.w[10])
    const term4 = this.math.sub(this.math.exp(inner_exp), 1)
    
    const product = this.math.mul(
      this.math.mul(
        this.math.mul(
          this.math.mul(term1, term2),
          term3
        ),
        term4
      ),
      this.math.mul(hard_penalty, easy_bonus)
    )
    
    const result = this.math.mul(s, this.math.add(product, 1))
    return this.math.clip(result, S_MIN, 36500.0)
  }

  /**
   * Next forget stability calculation
   * S'_f(D,S,R) = w_11*D^{-w_12}*((S+1)^{w_13}-1)*e^{w_14*(1-R)}
   */
  next_forget_stability(d: T, s: T, r: T): T {
    // CRITICAL FIX: Exponents should be raw numbers, not tensors
    const d_exponent = -this.parameters.w[12]  // Fixed hyperparameter
    const s_exponent = this.parameters.w[13]   // Fixed hyperparameter
    const exp_exponent = this.math.mul(this.math.sub(1, r), this.w[14])
    
    const term1 = this.math.mul(this.w[11], this.math.pow(d, d_exponent))  // base is T, exp is number
    const term2 = this.math.sub(this.math.pow(this.math.add(s, 1), s_exponent), 1)  // base is T, exp is number
    const term3 = this.math.exp(exp_exponent)
    
    const result = this.math.mul(this.math.mul(term1, term2), term3)
    return this.math.clip(result, S_MIN, 36500.0)
  }

  /**
   * Next short term stability calculation
   * S'_s(S,G) = S * e^{w_17 * (G-3+w_18)}
   */
  next_short_term_stability(s: T, g: Grade): T {
    const exponent = this.math.mul(this.w[17], this.math.add(g - 3, this.w[18]))
    // CRITICAL FIX: Exponent should be raw number, not tensor
    const s_exponent = -this.parameters.w[19]  // Fixed hyperparameter
    const sinc = this.math.mul(
      this.math.pow(s, s_exponent),  // base is T, exp is number
      this.math.exp(exponent)
    )
    
    const maskedSinc = g >= 3 ? this.math.max(sinc, 1.0) : sinc
    const result = this.math.mul(s, maskedSinc)
    return this.math.clip(result, S_MIN, 36500.0)
  }

  /**
   * Apply fuzz to interval (only works with numbers for backward compatibility)
   */
  apply_fuzz(ivl: number, elapsed_days: number): int {
    if (!this.parameters.enable_fuzz || ivl < 2.5) return Math.round(ivl) as int
    const generator = alea(this._seed)
    const fuzz_factor = generator()
    const { min_ivl, max_ivl } = get_fuzz_range(ivl, elapsed_days, this.parameters.maximum_interval)
    return Math.floor(fuzz_factor * (max_ivl - min_ivl + 1) + min_ivl) as int
  }
}