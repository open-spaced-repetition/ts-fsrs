import pseudorandom from "seedrandom";
import { generatorParameters } from "./default";
import {SchedulingCard} from './scheduler'
import {FSRSParameters, Grade, Rating} from "./models";
import type { int } from "./type";
import { get_fuzz_range } from "./help";

// Ref: https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm#fsrs-v4
export class FSRSAlgorithm {
  protected param: FSRSParameters;
  private readonly intervalModifier: number;
  protected seed?: string;
  private readonly DECAY: number = -0.5;
  private readonly FACTOR: number = Math.pow(0.9, 1 / this.DECAY) - 1;

  constructor(param: Partial<FSRSParameters>) {
    this.param = generatorParameters(param);
    // Ref: https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm#fsrs-45
    // The formula used is : I(r,s)= (r^{\frac{1}{DECAY}-1}) \times \frac{s}{FACTOR}
    this.intervalModifier = (Math.pow(this.param.request_retention, 1 / this.DECAY) - 1) / this.FACTOR;
  }

  init_ds(s: SchedulingCard): void {
    s.again.difficulty = this.init_difficulty(Rating.Again);
    s.again.stability = this.init_stability(Rating.Again);
    s.hard.difficulty = this.init_difficulty(Rating.Hard);
    s.hard.stability = this.init_stability(Rating.Hard);
    s.good.difficulty = this.init_difficulty(Rating.Good);
    s.good.stability = this.init_stability(Rating.Good);
    s.easy.difficulty = this.init_difficulty(Rating.Easy);
    s.easy.stability = this.init_stability(Rating.Easy);
  }

  /**
   * Updates the difficulty and stability values of the scheduling card based on the last difficulty,
   * last stability, and the current retrievability.
   * @param {SchedulingCard} s scheduling Card
   * @param {number} last_d Difficulty
   * @param {number} last_s Stability
   * @param retrievability Retrievability
   */
  next_ds(
    s: SchedulingCard,
    last_d: number,
    last_s: number,
    retrievability: number,
  ): void {
    s.again.difficulty = this.next_difficulty(last_d, Rating.Again);
    s.again.stability = this.next_forget_stability(
      last_d,
      last_s,
      retrievability,
    );
    s.hard.difficulty = this.next_difficulty(last_d, Rating.Hard);
    s.hard.stability = this.next_recall_stability(
      last_d,
      last_s,
      retrievability,
      Rating.Hard,
    );
    s.good.difficulty = this.next_difficulty(last_d, Rating.Good);
    s.good.stability = this.next_recall_stability(
      last_d,
      last_s,
      retrievability,
      Rating.Good,
    );
    s.easy.difficulty = this.next_difficulty(last_d, Rating.Easy);
    s.easy.stability = this.next_recall_stability(
      last_d,
      last_s,
      retrievability,
      Rating.Easy,
    );
  }

  /**
   * The formula used is :
   * S_0(G) = w_{G-1}
   * \max \{S_0,0.1\}
   * @param g Grade (rating at Anki) [1.again,2.hard,3.good,4.easy]
   * @return Stability (interval when R=90%)
   */
  init_stability(g: Grade): number {
    return Math.max(this.param.w[g - 1], 0.1);
  }

  /**
   * The formula used is :
   * $$D_0(G) = w_4 - (G-3) \cdot w_5$$
   * $$\min \{\max \{D_0(G),1\},10\}$$
   * where the D_0(3)=w_4 when the first rating is good.
   * @param {Grade} g Grade (rating at Anki) [1.again,2.hard,3.good,4.easy]
   * @return {number} Difficulty D \in [1,10]
   */
  init_difficulty(g: Grade): number {
    return Math.min(
      Math.max(this.param.w[4] - (g - 3) * this.param.w[5], 1),
      10,
    );
  }

  /**
   * If fuzzing is disabled or ivl is less than 2.5, it returns the original interval.
   * @param {number} ivl - The interval to be fuzzed.
   * @param {number} elapsed_days t days since the last review
   * @param {number} enable_fuzz - This adds a small random delay to the new interval time to prevent cards from sticking together and always being reviewed on the same day.
   * @return {number} - The fuzzed interval.
   **/
  apply_fuzz(ivl: number, elapsed_days: number, enable_fuzz?: boolean): int {
    if (!enable_fuzz || ivl < 2.5) return Math.round(ivl) as int;
    const generator = pseudorandom(this.seed);
    const fuzz_factor = generator();
    const { min_ivl, max_ivl } = get_fuzz_range(
      ivl,
      elapsed_days,
      this.param.maximum_interval,
    );
    return Math.floor(fuzz_factor * (max_ivl - min_ivl + 1) + min_ivl) as int;
  }

  /**
   *  Ref:
   *   constructor(param: Partial<FSRSParameters>)
   *   this.intervalModifier = 9 * (1 / this.param.request_retention - 1);
   *   @param {number} s - Stability (interval when R=90%)
   *   @param {number} elapsed_days t days since the last review
   *   @param {number} enable_fuzz - This adds a small random delay to the new interval time to prevent cards from sticking together and always being reviewed on the same day.
   */
  next_interval(
    s: number,
    elapsed_days: number,
    enable_fuzz: boolean = this.param.enable_fuzz,
  ): int {
    const newInterval = Math.min(
      Math.max(1, Math.round(s * this.intervalModifier)),
      this.param.maximum_interval,
    ) as int;
    return this.apply_fuzz(newInterval, elapsed_days, enable_fuzz);
  }

  /**
   * The formula used is :
   * $$next_d = D - w_6 \cdot (R - 2)$$
   * $$D^\prime(D,R) = w_5 \cdot D_0(2) +(1 - w_5) \cdot next_d$$
   * @param {number} d Difficulty D \in [1,10]
   * @param {Grade} g Grade (rating at Anki) [1.again,2.hard,3.good,4.easy]
   * @return {number} next_D
   */
  next_difficulty(d: number, g: Grade): number {
    const next_d = d - this.param.w[6] * (g - 3);
    return this.constrain_difficulty(
      this.mean_reversion(this.param.w[4], next_d),
    );
  }

  /**
   * The formula used is :
   * $$\min \{\max \{D_0,1\},10\}$$
   * @param {number} difficulty D \in [1,10]
   */
  constrain_difficulty(difficulty: number): number {
    return Math.min(Math.max(Number(difficulty.toFixed(2)), 1), 10);
  }

  /**
   * The formula used is :
   * $$w_7 \cdot init +(1 - w_7) \cdot current$$
   * @param {number} init $$w_2 : D_0(3) = w_2 + (R-2) \cdot w_3= w_2$$
   * @param {number} current $$D - w_6 \cdot (R - 2)$$
   * @return {number} difficulty
   */
  mean_reversion(init: number, current: number): number {
    return this.param.w[7] * init + (1 - this.param.w[7]) * current;
  }

  /**
   * The formula used is :
   * $$S^\prime_r(D,S,R,G) = S\cdot(e^{w_8}\cdot (11-D)\cdot S^{-w_9}\cdot(e^{w_10\cdot(1-R)}-1)\cdot w_15(if G=2) \cdot w_16(if G=4)+1)$$
   * @param {number} d Difficulty D \in [1,10]
   * @param {number} s Stability (interval when R=90%)
   * @param {number} r Retrievability (probability of recall)
   * @param {Grade} g Grade (Rating[0.again,1.hard,2.good,3.easy])
   * @return {number} S^\prime_r new stability after recall
   */
  next_recall_stability(d: number, s: number, r: number, g: Grade): number {
    const hard_penalty = Rating.Hard === g ? this.param.w[15] : 1;
    const easy_bound = Rating.Easy === g ? this.param.w[16] : 1;
    return (
      s *
      (1 +
        Math.exp(this.param.w[8]) *
          (11 - d) *
          Math.pow(s, -this.param.w[9]) *
          (Math.exp((1 - r) * this.param.w[10]) - 1) *
          hard_penalty *
          easy_bound)
    );
  }

  /**
   * The formula used is :
   * $$S^\prime_f(D,S,R) = w_11\cdot D^{-w_{12}}\cdot ((S+1)^{w_{13}}-1) \cdot e^{w_{14}\cdot(1-R)}.$$
   * @param {number} d Difficulty D \in [1,10]
   * @param {number} s Stability (interval when R=90%)
   * @param {number} r Retrievability (probability of recall)
   * @return {number} S^\prime_f new stability after forgetting
   */
  next_forget_stability(d: number, s: number, r: number): number {
    return Number((
      this.param.w[11] *
      Math.pow(d, -this.param.w[12]) *
      (Math.pow(s + 1, this.param.w[13]) - 1) *
      Math.exp((1 - r) * this.param.w[14])
    ).toFixed(2));
  }

  /**
   * The formula used is :
   * $$R(t,S) = (1 + FACTOR \times \frac{t}{9 \cdot S})^{DECAY},$$
   * @param {number} elapsed_days t days since the last review
   * @param {number} stability Stability (interval when R=90%)
   * @return {number} r Retrievability (probability of recall)
   */
  forgetting_curve(elapsed_days: number, stability: number): number {
    return Math.pow(1 + this.FACTOR * elapsed_days / stability, this.DECAY);
  }
}
