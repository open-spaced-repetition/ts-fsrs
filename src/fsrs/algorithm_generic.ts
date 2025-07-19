import { IMath } from './math';
import { S_MIN } from './constant';
import { type FSRSState, type Grade, Rating } from './models';

/**
 * Generic FSRS Algorithm that can work with both numbers and tensors.
 * This class contains the pure, mathematical core of the FSRS algorithm,
 * decoupled from specific data types and FSRS parameter structures.
 */
export class FSRSAlgorithm<T> {
  protected math: IMath<T>;
  w: T[];

  constructor(w: T[], math: IMath<T>) {
    this.math = math;
    this.w = w;
  }

  /**
   * Initial stability calculation.
   * S_0(G) = w_{G-1}
   */
  init_stability(g: Grade): T {
    return this.w[g - 1];
  }

  /**
   * Initial difficulty calculation.
   * D_0(G) = w_4 - e^{(G-1) * w_5} + 1
   */
  init_difficulty(g: Grade): T {
    const g_minus_1 = this.math.toTensor(g - 1);
    const term = this.math.mul(this.w[5], g_minus_1);
    const difficulty = this.math.add(this.math.sub(this.w[4], this.math.exp(term)), this.math.toTensor(1));
    return this.math.round(difficulty);
  }

  /**
   * Forgetting curve calculation.
   * R(t,S) = (1 + FACTOR * t/S)^DECAY
   */
  forgetting_curve(elapsed_days: number, stability: T, decay: number, factor: number): T {
    const term = this.math.mul(this.math.div(this.math.toTensor(1), stability), factor * elapsed_days);
    const base = this.math.add(this.math.toTensor(1), term);
    const forgetting_curve = this.math.pow(base, decay);
    return this.math.round(forgetting_curve);
  }

  /**
   * Next interval calculation.
   */
  next_interval(s: T, intervalModifier: number): T {
    const newInterval = this.math.mul(s, intervalModifier);
    return this.math.round(newInterval);
  }

  /**
   * Mean reversion calculation for difficulty.
   */
  private mean_reversion(init: T, current: T): T {
    const term1 = this.math.mul(this.w[7], init);
    const term2 = this.math.mul(this.math.sub(this.math.toTensor(1), this.w[7]), current);
    return this.math.round(this.math.add(term1, term2));
  }

  /**
   * Linear damping calculation for difficulty.
   */
  private linear_damping(delta_d: T, old_d: T): T {
    const nine_tensor = this.math.toTensor(9);
    const ten_tensor = this.math.toTensor(10);
    const factor = this.math.div(this.math.sub(ten_tensor, old_d), nine_tensor);
    return this.math.round(this.math.mul(delta_d, factor));
  }

  /**
   * Next difficulty calculation.
   * D' = D - w_6 * (G - 3)
   * D' = D + linear_damping(D' - D, D)
   * D' = w_7 * D_0(4) + (1 - w_7) * D'
   */
  next_difficulty(d: T, g: Grade): T {
    const delta_d = this.math.mul(this.w[6], g - 3);
    const damped_d = this.math.sub(d, this.linear_damping(delta_d, d));
    const init_easy = this.init_difficulty(Rating.Easy);
    const result = this.mean_reversion(init_easy, damped_d);
    return this.math.clip(result, 1, 10);
  }

  /**
   * Next recall stability calculation.
   * S'_r(D,S,R,G) = S*(1 + e^{w_8}*(11-D)*S^{-w_9}*(e^{w_{10}*(1-R)}-1)*hard_penalty*easy_bonus)
   */
  next_recall_stability(d: T, s: T, r: T, g: Grade): T {
    const hard_penalty = g === Rating.Hard ? this.w[15] : this.math.toTensor(1);
    const easy_bonus = g === Rating.Easy ? this.w[16] : this.math.toTensor(1);

    // FIX: Exponents for pow must be numbers. Convert the weight tensor to a number.
    const s_exponent = -this.math.toNumber(this.w[9]);

    const term1 = this.math.exp(this.w[8]);
    const term2 = this.math.sub(this.math.toTensor(11), d);
    const term3 = this.math.pow(s, s_exponent);
    const inner_exp = this.math.mul(this.math.sub(this.math.toTensor(1), r), this.w[10]);
    const term4 = this.math.sub(this.math.exp(inner_exp), this.math.toTensor(1));

    const product = this.math.mul(
      this.math.mul(this.math.mul(this.math.mul(term1, term2), term3), term4),
      this.math.mul(hard_penalty, easy_bonus)
    );

    const result = this.math.mul(s, this.math.add(product, this.math.toTensor(1)));
    const clipped = this.math.clip(result, S_MIN, 36500.0);
    return this.math.round(clipped);
  }

  /**
   * Next forget stability calculation.
   * S'_f(D,S,R) = w_{11}*D^{-w_{12}}*((S+1)^{w_{13}}-1)*e^{w_{14}*(1-R)}
   */
  next_forget_stability(d: T, s: T, r: T): T {
    // FIX: Exponents for pow must be numbers.
    const d_exponent = -this.math.toNumber(this.w[12]);
    const s_exponent = this.math.toNumber(this.w[13]);

    const exp_exponent = this.math.mul(this.math.sub(this.math.toTensor(1), r), this.w[14]);

    const term1 = this.math.mul(this.w[11], this.math.pow(d, d_exponent));
    const term2 = this.math.sub(this.math.pow(this.math.add(s, this.math.toTensor(1)), s_exponent), this.math.toTensor(1));
    const term3 = this.math.exp(exp_exponent);

    const result = this.math.mul(this.math.mul(term1, term2), term3);
    const clipped = this.math.clip(result, S_MIN, 36500.0);
    return this.math.round(clipped);
  }

  /**
   * Next short term stability calculation.
   * S'_s(S,G) = S * (S^{-w_19} * e^{w_17 * (G-3+w_18)})
   */
  next_short_term_stability(s: T, g: Grade): T {
    // FIX: Exponents for pow must be numbers.
    const s_exponent = -this.math.toNumber(this.w[19]);

    const exponent = this.math.mul(this.w[17], this.math.add(this.math.toTensor(g - 3), this.w[18]));
    const sinc = this.math.mul(this.math.pow(s, s_exponent), this.math.exp(exponent));

    const maskedSinc = g >= 3 ? this.math.max(sinc, 1.0) : sinc;
    const result = this.math.mul(s, maskedSinc);
    const clipped = this.math.clip(result, S_MIN, 36500.0);
    return this.math.round(clipped);
  }

  /**
   * Centralized state transition logic.
   * This method is now the single source of truth for updating a card's memory state.
   */
  next_state(current_s: T, current_d: T, grade: Grade, elapsed_days: number, enable_short_term: boolean, decay: number, factor: number): FSRSState<T> {
    const r = this.forgetting_curve(elapsed_days, current_s, decay, factor);
    const new_d = this.next_difficulty(current_d, grade);
    let new_s: T;

    if (grade === Rating.Again) {
        const s_after_fail = this.next_forget_stability(current_d, current_s, r);
        
        let w17: T | number = this.math.toTensor(0);
        let w18: T | number = this.math.toTensor(0);
        if (enable_short_term) {
            w17 = this.w[17];
            w18 = this.w[18];
        }
        
        const next_s_min_unrounded = this.math.div(current_s, this.math.exp(this.math.mul(w17, w18)));
        const next_s_min = this.math.round(next_s_min_unrounded);
        
        const clamped_s_min = this.math.max(next_s_min, S_MIN);
        new_s = this.math.min(clamped_s_min, s_after_fail);

    } else {
      new_s = this.next_recall_stability(current_d, current_s, r, grade);
    }

    if (elapsed_days === 0 && enable_short_term) {
      new_s = this.next_short_term_stability(current_s, grade);
    }

    return { stability: new_s, difficulty: new_d };
  }
}