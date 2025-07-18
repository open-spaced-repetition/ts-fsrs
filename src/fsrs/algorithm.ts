// src/algorithm.ts

import { alea } from './alea';
import { S_MIN } from './constant';
import {
    clipParameters,
    generatorParameters,
    migrateParameters,
} from './default';
import { clamp, get_fuzz_range } from './help';
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
 * $$R(t,S) = (1 + \text{FACTOR} \times \frac{t}{9 \cdot S})^{\text{DECAY}}$$
 * @param parameters - FSRS parameters array
 * @param elapsed_days - Elapsed days since the last review
 * @param stability - Current stability of the card
 * @returns The forgetting curve value
 */
export function forgetting_curve(
  parameters: number[] | readonly number[],
  elapsed_days: number,
  stability: number
): number {
  const decay = -parameters[20];
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
    // Initialize and proxy parameters for dynamic updates.
    this.param = new Proxy(
      generatorParameters(params),
      this.params_handler_proxy()
    );

    // Initialize the generic algorithm with a NumberMath implementation.
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
    // Ensure the seed is passed to the generic algorithm instance.
    this.genericAlgorithm.seed = seed;
  }

  /**
   * Get the parameters of the algorithm.
   */
  get parameters(): FSRSParameters {
    return this.param;
  }

  /**
   * Set the parameters of the algorithm.
   * @param params Partial<FSRSParameters>
   */
  set parameters(params: Partial<FSRSParameters>) {
    this.update_parameters(params);
  }

  /**
   * Proxies parameter updates to ensure dependent properties and the
   * generic algorithm instance are kept in sync.
   */
  protected params_handler_proxy(): ProxyHandler<FSRSParameters> {
    const _this = this;
    return {
      set: function (
        target: FSRSParameters,
        prop: keyof FSRSParameters,
        value: FSRSParameters[keyof FSRSParameters]
      ) {
        const oldValue = Reflect.get(target, prop);
        Reflect.set(target, prop, value);

        // Only update if the value has actually changed.
        if (oldValue !== value) {
          if (prop === 'request_retention' && Number.isFinite(value)) {
            _this.intervalModifier = _this.calculate_interval_modifier(
              Number(value)
            );
          } else if (prop === 'w') {
            const newW = clipParameters(
              migrateParameters(value as FSRSParameters['w']),
              target.relearning_steps.length
            );
            Reflect.set(target, 'w', newW);
            _this.intervalModifier = _this.calculate_interval_modifier(
              target.request_retention
            );
          }
          // After any change, re-initialize the generic algorithm with the new params.
          _this.genericAlgorithm = new GenericAlgorithm(target, new NumberMath());
        }
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

  /**
   * Calculates the interval modifier based on the desired retention rate.
   */
  private calculate_interval_modifier(request_retention: number): number {
    if (request_retention <= 0 || request_retention > 1) {
      throw new Error('Requested retention rate should be in the range (0,1]');
    }
    const decay = -this.param.w[20];
    const factor = Math.pow(0.9, 1 / decay) - 1;
    return +((Math.pow(request_retention, 1 / decay) - 1) / factor).toFixed(8);
  }

  /**
   * Applies random fuzz to the interval to prevent cards from clustering.
   * This is number-specific logic and thus belongs in this wrapper class.
   */
  private apply_fuzz(ivl: number, elapsed_days: number): int {
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

  // ============================================================
  // DELEGATED ALGORITHM METHODS
  // All core formula calculations are delegated to the generic
  // algorithm instance to ensure a single source of truth.
  // ============================================================

  public init_stability(g: Grade): number {
    return this.genericAlgorithm.init_stability(g);
  }

  public init_difficulty(g: Grade): number {
    return this.genericAlgorithm.init_difficulty(g);
  }

  public next_difficulty(d: number, g: Grade): number {
    return this.genericAlgorithm.next_difficulty(d, g);
  }

  public next_recall_stability(d: number, s: number, r: number, g: Grade): number {
    return this.genericAlgorithm.next_recall_stability(d, s, r, g);
  }

  public next_forget_stability(d: number, s: number, r: number): number {
    return this.genericAlgorithm.next_forget_stability(d, s, r);
  }

  public next_short_term_stability(s: number, g: Grade): number {
    return this.genericAlgorithm.next_short_term_stability(s, g);
  }

  /**
   * Calculates the next interval for a card.
   * It gets the raw interval from the generic core and then applies number-specific fuzzing.
   */
  public next_interval(s: number, elapsed_days: number): int {
    const raw_interval = this.genericAlgorithm.next_interval(s, this.intervalModifier);
    return this.apply_fuzz(raw_interval, elapsed_days);
  }

  /**
   * Calculates the next memory state (difficulty and stability) of a card.
   * This method contains the state transition logic, delegating all
   * mathematical calculations to the appropriate core methods.
   */
  public next_state(memory_state: FSRSState | null, t: number, g: Grade): FSRSState {
    const { difficulty: d, stability: s } = memory_state ?? {
      difficulty: 0,
      stability: 0,
    };

    // State management checks
    if (t < 0) throw new Error(`Invalid delta_t "${t}"`);
    if (g < 0 || g > 4) throw new Error(`Invalid grade "${g}"`);
    if (g === Rating.Manual) return { difficulty: d, stability: s };
    if (d === 0 && s === 0) {
      return {
        difficulty: this.init_difficulty(g),
        stability: this.init_stability(g),
      };
    }
    if (d < 1 || s < S_MIN) {
      throw new Error(`Invalid memory state { difficulty: ${d}, stability: ${s} }`);
    }

    // Core calculation flow using delegated methods
    const r = forgetting_curve(this.param.w, t, s);
    const new_d = this.next_difficulty(d, g);
    let new_s: number;

    if (g === Rating.Again) {
      // On "Again", calculate forget stability and apply short-term constraints
      const s_after_fail = this.next_forget_stability(d, s, r);
      if (this.param.enable_short_term) {
        const w17 = this.param.w[17];
        const w18 = this.param.w[18];
        const next_s_min = s / Math.exp(w17 * w18);
        new_s = clamp(+next_s_min.toFixed(8), S_MIN, s_after_fail);
      } else {
        new_s = s_after_fail;
      }
    } else {
      // On "Hard", "Good", or "Easy", calculate recall stability
      new_s = this.next_recall_stability(d, s, r, g);
    }

    // Apply short-term stability update if it's a same-day review
    if (t === 0 && this.param.enable_short_term) {
      new_s = this.next_short_term_stability(s, g);
    }

    return { difficulty: new_d, stability: new_s };
  }
}