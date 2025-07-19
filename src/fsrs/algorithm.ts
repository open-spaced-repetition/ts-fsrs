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
  protected genericAlgorithm: GenericAlgorithm<number>;

  constructor(params: Partial<FSRSParameters>) {
    this.param = new Proxy(
      generatorParameters(params),
      this.params_handler_proxy()
    );
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
        if (prop === 'request_retention') {
            if (typeof value === 'number') {
                if (value <= 0 || value > 1) {
                    throw new Error('Requested retention rate should be in the range (0,1]');
                }
                _this.intervalModifier = _this.calculate_interval_modifier(value);
            }
        } else if (prop === 'w') {
            const new_w = clipParameters(
                migrateParameters(value as FSRSParameters['w']),
                target.relearning_steps.length
            );
            value = new_w;
            _this.genericAlgorithm.w = new_w;
            _this.intervalModifier = _this.calculate_interval_modifier(target.request_retention);
        }
        Reflect.set(target, prop, value);
        return true;
      },
    };
  }

  protected update_parameters(params: Partial<FSRSParameters>): void {
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

  public next_state(
    memory_state: FSRSState | null,
    elapsed_days: number,
    g: number
  ): FSRSState {
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
      const initial_d = this.init_difficulty(g as Grade);
      return {
        difficulty: clamp(initial_d, 1, 10),
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

    const result = this.genericAlgorithm.next_state(s, d, g as Grade, elapsed_days);
    return {
      difficulty: result.difficulty,
      stability: result.stability,
    };
  }

  public init_stability(g: Grade): number {
    const raw_s = this.genericAlgorithm.init_stability(g);
    return Math.max(raw_s, 0.1);
  }

  public init_difficulty(g: Grade): number {
    const raw_d = this.genericAlgorithm.init_difficulty(g);
    return +raw_d.toFixed(8);
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

  public forgetting_curve(elapsed_days: number, stability: number): number {
    return this.genericAlgorithm.forgetting_curve(elapsed_days, stability);
  }
}