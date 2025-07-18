import { alea } from './alea';
import {
  clipParameters,
  generatorParameters,
  migrateParameters,
} from './default';
import { get_fuzz_range } from './help';
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

  protected calculate_interval_modifier(request_retention: number): number {
    if (request_retention <= 0 || request_retention > 1) {
      throw new Error('Requested retention rate should be in the range (0,1]');
    }
    const decay = -this.param.w[20];
    const factor = Math.pow(0.9, 1 / decay) - 1;
    return +((Math.pow(request_retention, 1 / decay) - 1) / factor).toFixed(8);
  }

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

  public next_interval(s: number, elapsed_days: number): int {
    const raw_interval = this.genericAlgorithm.next_interval(s, this.intervalModifier);
    return this.apply_fuzz(raw_interval, elapsed_days);
  }

  /**
   * Calculates the next memory state (difficulty and stability) of a card.
   * This method now acts as a simple wrapper, handling initial state checks and
   * delegating the core logic to the generic algorithm.
   */
  public next_state(memory_state: FSRSState | null, elapsed_days: number, g: Grade): FSRSState {
    const { difficulty: d, stability: s } = memory_state ?? {
      difficulty: 0,
      stability: 0,
    };

    if (d === 0 && s === 0) {
      return {
        difficulty: this.genericAlgorithm.init_difficulty(g),
        stability: this.genericAlgorithm.init_stability(g),
      };
    }

    return this.genericAlgorithm.next_state(s, d, g, elapsed_days);
  }

  /**
   * Provides a forgetting curve calculation method for backward compatibility,
   * especially for the `FSRS` class that extends this one.
   */
  public forgetting_curve(elapsed_days: number, stability: number): number {
    return forgetting_curve(this.param.w, elapsed_days, stability);
  }
}