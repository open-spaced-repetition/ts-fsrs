import { alea } from './alea';
import { S_MIN } from './constant';
import {
  clipParameters,
  generatorParameters,
  migrateParameters,
} from './default';
import { get_fuzz_range, clamp } from './help';
import {
  type FSRSParameters,
  type FSRSState,
  type Grade,
  Rating,
} from './models';
import type { int } from './types';
import { NumberMath } from './math';
import { FSRSAlgorithm as GenericAlgorithm } from './algorithm_generic';

/**
 * Standalone utility function to calculate the forgetting curve.
 * This is kept separate as it's a pure utility used in various places.
 * $$R(t,S) = (1 + \text{FACTOR} \times \frac{t}{S})^{\text{DECAY}}$$
 */
export function forgetting_curve(
  parameters: number[] | readonly number[] | number,
  elapsed_days: number,
  stability: number
): number {
  const decayValue = Array.isArray(parameters) ? parameters[20] : parameters;
  const decay = -decayValue;
  const factor = Math.pow(0.9, 1 / decay) - 1;
  return +Math.pow(1 + (factor * elapsed_days) / stability, decay).toFixed(8);
}

/**
 * The public-facing FSRSAlgorithm class.
 *
 * This class serves as a robust, backward-compatible wrapper around the generic FSRS algorithm core.
 * It handles all number-specific logic, state management, and parameter proxying, while delegating
 * all core formula calculations to the `GenericAlgorithm<number>` instance. This ensures a single
 * source of truth for the FSRS formulas, enhancing maintainability and correctness.
 */
export class FSRSAlgorithm {
  protected param!: FSRSParameters;
  protected intervalModifier!: number;
  protected _seed?: string;
  private genericAlgorithm: GenericAlgorithm<number>;

  constructor(params: Partial<FSRSParameters>) {
    // The proxy handler MUST be set up before other properties that depend on `param`.
    this.param = new Proxy(
      generatorParameters(params),
      this.params_handler_proxy()
    );
    // Now initialize dependent properties
    this.genericAlgorithm = new GenericAlgorithm(this.param, new NumberMath());
    this.intervalModifier = this.calculate_interval_modifier(
      this.param.request_retention
    );
  }

  get interval_modifier(): number {
    return this.intervalModifier;
  }

  set seed(seed: string) {
    this._seed = seed;
    this.genericAlgorithm.seed = seed;
  }

  get parameters(): FSRSParameters {
    return this.param;
  }

  set parameters(params: Partial<FSRSParameters>) {
    this.update_parameters(params);
  }

  protected params_handler_proxy(): ProxyHandler<FSRSParameters> {
    const _this = this;
    return {
      set: function (
        target: FSRSParameters,
        prop: keyof FSRSParameters,
        value: FSRSParameters[keyof FSRSParameters]
      ) {
        Reflect.set(target, prop, value);
        
        // After any change, regenerate the full parameter object to handle clipping and migrations,
        // then re-instantiate all dependent properties to ensure complete consistency.
        _this.param = generatorParameters(target);
        _this.genericAlgorithm = new GenericAlgorithm(_this.param, new NumberMath());
        _this.intervalModifier = _this.calculate_interval_modifier(_this.param.request_retention);
        
        return true;
      },
    };
  }

  private update_parameters(params: Partial<FSRSParameters>): void {
    const _params = generatorParameters(params);
    for (const key in _params) {
      const paramKey = key as keyof FSRSParameters;
      this.param[paramKey] = _params[paramKey] as never;
    }
  }

  public calculate_interval_modifier(request_retention: number): number {
    if (request_retention <= 0 || request_retention > 1) {
      throw new Error('Requested retention rate should be in the range (0,1]');
    }
    const decay = -this.param.w[20];
    const factor = Math.pow(0.9, 1 / decay) - 1;
    return +((Math.pow(request_retention, 1 / decay) - 1) / factor).toFixed(8);
  }

  public apply_fuzz(ivl: number, elapsed_days: number): int {
    if (!this.param.enable_fuzz || ivl < 2.5) return Math.round(ivl) as int;
    const generator = alea(this._seed);
    const fuzz_factor = generator();
    const { min_ivl, max_ivl } = get_fuzz_range(
      ivl,
      elapsed_days,
      this.param.maximum_interval
    );
    return Math.floor(fuzz_factor * (max_ivl - min_ivl + 1) + min_ivl) as int;
  }

  public next_interval(s: number, elapsed_days: number): int {
    const raw_interval = this.genericAlgorithm.next_interval(s, this.intervalModifier);
    return this.apply_fuzz(raw_interval, elapsed_days);
  }

  /**
   * Calculates the next memory state (difficulty and stability) of a card.
   * This method now acts as a simple wrapper, handling initial state checks and
   * delegating the core logic to the generic algorithm.
   */
  public next_state(memory_state: FSRSState | null, elapsed_days: number, g: number): FSRSState {
    const { difficulty: d, stability: s } = memory_state ?? {
      difficulty: 0,
      stability: 0,
    };

    if (elapsed_days < 0) {
      throw new Error(`Invalid delta_t "${elapsed_days}"`);
    }
    if (g < 0 || g > 4) {
      throw new Error(`Invalid grade "${g}"`);
    }

    if (d === 0 && s === 0) {
      // Use the corrected wrapper methods
      const initial_d = this.init_difficulty(g as Grade);
      const clamped_d = clamp(initial_d, 1, 10);
      return {
        difficulty: clamped_d,
        stability: this.init_stability(g as Grade),
      };
    }

    if (g === Rating.Manual) {
      return {
        difficulty: d,
        stability: s,
      };
    }

    if (d < 1 || s < S_MIN) {
      throw new Error(
        `Invalid memory state { difficulty: ${d}, stability: ${s} }`
      );
    }

    const r = this.forgetting_curve(elapsed_days, s);
    const s_after_success = this.next_recall_stability(d, s, r, g as Grade);
    const s_after_fail = this.next_forget_stability(d, s, r);
    const s_after_short_term = this.next_short_term_stability(s, g as Grade);

    let new_s = s_after_success;
    if (g === Rating.Again) {
      let [w_17, w_18] = [0, 0];
      if (this.param.enable_short_term) {
        w_17 = this.param.w[17];
        w_18 = this.param.w[18];
      }
      const next_s_min = s / Math.exp(w_17 * w_18);
      // This line is critical: it replicates the original's specific rounding and clamping for this case.
      new_s = clamp(+next_s_min.toFixed(8), S_MIN, s_after_fail);
    }

    if (elapsed_days === 0 && this.param.enable_short_term) {
      new_s = s_after_short_term;
    }

    const new_d = this.next_difficulty(d, g as Grade);
    // The final stability does not need extra clamping here, as the sub-methods already handle it.
    return { difficulty: new_d, stability: new_s };
  }

  public init_stability(g: Grade): number {
    return Math.max(this.parameters.w[g - 1], 0.1);
  }

  public init_difficulty(g: Grade): number {
    const raw_d = this.genericAlgorithm.init_difficulty(g);
    return +raw_d.toFixed(8); // Return the raw, rounded value
  }

  private linear_damping(delta_d: number, old_d: number): number {
    return +((delta_d * (10 - old_d)) / 9).toFixed(8);
  }

  private mean_reversion(init: number, current: number): number {
    return +(this.parameters.w[7] * init + (1 - this.parameters.w[7]) * current).toFixed(
      8
    );
  }

  public next_difficulty(d: number, g: Grade): number {
    const delta_d = -this.parameters.w[6] * (g - 3);
    const next_d = d + this.linear_damping(delta_d, d);
    const reverted_d = this.mean_reversion(this.init_difficulty(Rating.Easy), next_d);
    return clamp(reverted_d, 1, 10);
  }

  public next_recall_stability(d: number, s: number, r: number, g: Grade): number {
    const result = this.genericAlgorithm.next_recall_stability(d, s, r, g);
    return +result.toFixed(8);
  }

  public next_forget_stability(d: number, s: number, r: number): number {
    const result = this.genericAlgorithm.next_forget_stability(d, s, r);
    return +result.toFixed(8);
  }

  public next_short_term_stability(s: number, g: Grade): number {
    const result = this.genericAlgorithm.next_short_term_stability(s, g);
    return +result.toFixed(8);
  }

  /**
   * Provides a forgetting curve calculation method for backward compatibility,
   * especially for the `FSRS` class that extends this one.
   */
  public forgetting_curve(elapsed_days: number, stability: number): number {
    return forgetting_curve(this.param.w, elapsed_days, stability);
  }
}