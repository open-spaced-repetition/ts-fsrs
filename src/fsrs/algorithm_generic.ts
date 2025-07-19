import { IMath } from './math';
import { S_MIN } from './constant';
import { type FSRSParameters, type FSRSState, type Grade, Rating } from './models';

/**
 * Generic FSRS Algorithm that can work with both numbers and tensors.
 * This class contains the pure, mathematical core of the FSRS algorithm,
 * decoupled from specific data types.
 */
export class FSRSAlgorithm<T> {
  protected math: IMath<T>;
  protected _seed?: string;

  w: T[]; // Made public to be updatable by the wrapper
  parameters: FSRSParameters;

  constructor(params: FSRSParameters, math: IMath<T>) {
    this.math = math;
    this.parameters = params;
    this.w = this.math.toTensorArray(this.parameters.w);
  }

  set seed(seed: string) {
    this._seed = seed;
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
    return difficulty;
  }

  /**
   * Forgetting curve calculation.
   * R(t,S) = (1 + FACTOR * t/S)^DECAY
   */
  forgetting_curve(elapsed_days: number, stability: T): T {
    const decay = -this.parameters.w[20];
    const factor = Math.pow(0.9, 1 / decay) - 1.0;

    const term = this.math.mul(this.math.div(this.math.toTensor(1), stability), factor * elapsed_days);
    const base = this.math.add(this.math.toTensor(1), term);
    const forgetting_curve = this.math.pow(base, decay);
    // FIX: Round the final result to match original precision.
    return this.math.round(forgetting_curve);
  }

  /**
   * Next interval calculation.
   */
  next_interval(s: T, intervalModifier: number): T {
    const newInterval = this.math.mul(s, intervalModifier);
    return this.math.clip(newInterval, 1, this.parameters.maximum_interval);
  }

  /**
   * Mean reversion calculation for difficulty.
   */
  private mean_reversion(init: T, current: T): T {
    const term1 = this.math.mul(this.w[7], init);
    const term2 = this.math.mul(this.math.sub(this.math.toTensor(1), this.w[7]), current);
    // FIX: Round the intermediate result as in the original algorithm.
    return this.math.round(this.math.add(term1, term2));
  }

  /**
   * Linear damping calculation for difficulty.
   */
  private linear_damping(delta_d: T, old_d: T): T {
    const nine_tensor = this.math.toTensor(9);
    const ten_tensor = this.math.toTensor(10);
    const factor = this.math.div(this.math.sub(ten_tensor, old_d), nine_tensor);
    // FIX: Round the intermediate result as in the original algorithm.
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
   * S'_r(D,S,R,G) = S*(1 + e^{w_8}*(11-D)*S^{-w_9}*(e^{w_10*(1-R)}-1)*hard_penalty*easy_bonus)
   */
  next_recall_stability(d: T, s: T, r: T, g: Grade): T {
    const hard_penalty = g === Rating.Hard ? this.w[15] : this.math.toTensor(1);
    const easy_bonus = g === Rating.Easy ? this.w[16] : this.math.toTensor(1);

    const s_exponent = -this.parameters.w[9];

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
   * S'_f(D,S,R) = w_11*D^{-w_12}*((S+1)^{w_13}-1)*e^{w_14*(1-R)}
   */
  next_forget_stability(d: T, s: T, r: T): T {
    const d_exponent = -this.parameters.w[12];
    const s_exponent = this.parameters.w[13];

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
    const s_exponent = -this.parameters.w[19];

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
  next_state(current_s: T, current_d: T, grade: Grade, elapsed_days: number): FSRSState<T> {
    const r = this.forgetting_curve(elapsed_days, current_s);
    const new_d = this.next_difficulty(current_d, grade);
    let new_s: T;

    if (grade === Rating.Again) {
        const s_after_fail = this.next_forget_stability(current_d, current_s, r);
        if (this.parameters.enable_short_term) {
            const w17 = this.w[17];
            const w18 = this.w[18];
            const next_s_min_unrounded = this.math.div(current_s, this.math.exp(this.math.mul(w17, w18)));
            const next_s_min = this.math.round(next_s_min_unrounded);
            const clamped_s_min = this.math.max(next_s_min, S_MIN);
            new_s = this.math.min(clamped_s_min, s_after_fail);
        } else {
            new_s = s_after_fail;
        }
    } else {
      new_s = this.next_recall_stability(current_d, current_s, r, grade);
    }

    if (elapsed_days === 0 && this.parameters.enable_short_term) {
      new_s = this.next_short_term_stability(current_s, grade);
    }

    return { stability: new_s, difficulty: new_d };
  }
}