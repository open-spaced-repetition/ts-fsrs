import pseudorandom from "seedrandom";
import { generatorParameters, SchedulingCard } from "./index";
import { FSRSParameters, Rating } from "./models";
import type { int } from "./type";

// Ref: https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm#fsrs-v4
export class FSRSAlgorithm {
  protected param: FSRSParameters;
  private readonly intervalModifier;
  protected seed?: string;

  constructor(param: Partial<FSRSParameters>) {
    this.param = generatorParameters(param);
    // Ref: https://github.com/open-spaced-repetition/py-fsrs/blob/ecd68e453611eb808c7367c7a5312d7cadeedf5c/src/fsrs/fsrs.py#L79
    // The formula used is : I(r,s)=9 \cdot  s \cdot (\frac{1}{r}-1)
    this.intervalModifier = 9 * (1 / this.param.request_retention - 1);
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
   *
   * @param s scheduling Card
   * @param last_d Difficulty
   * @param last_s Stability
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
      s.again.difficulty,
      last_s,
      retrievability,
    );
    s.hard.difficulty = this.next_difficulty(last_d, Rating.Hard);
    s.hard.stability = this.next_recall_stability(
      s.hard.difficulty,
      last_s,
      retrievability,
      Rating.Hard,
    );
    s.good.difficulty = this.next_difficulty(last_d, Rating.Good);
    s.good.stability = this.next_recall_stability(
      s.good.difficulty,
      last_s,
      retrievability,
      Rating.Good,
    );
    s.easy.difficulty = this.next_difficulty(last_d, Rating.Easy);
    s.easy.stability = this.next_recall_stability(
      s.easy.difficulty,
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
  init_stability(g: number): number {
    return Math.max(this.param.w[g - 1], 0.1);
  }

  /**
   * The formula used is :
   * $$D_0(G) = w_4 - (G-3) \cdot w_5$$
   * $$\min \{\max \{D_0(G),1\},10\}$$
   * where the D_0(3)=w_4 when the first rating is good.
   * @param g Grade (rating at Anki) [1.again,2.hard,3.good,4.easy]
   * @return Difficulty D \in [1,10]
   */
  init_difficulty(g: number): number {
    return Math.min(
      Math.max(this.param.w[4] - (g - 3) * this.param.w[5], 1),
      10,
    );
  }

  apply_fuzz(ivl: number) {
    if (!this.param.enable_fuzz || ivl < 2.5) return ivl;
    const generator = pseudorandom(this.seed);
    const fuzz_factor = generator();
    ivl = Math.round(ivl);
    const min_ivl = Math.max(2, Math.round(ivl * 0.95 - 1));
    const max_ivl = Math.round(ivl * 1.05 + 1);
    return Math.floor(fuzz_factor * (max_ivl - min_ivl + 1) + min_ivl);
  }

  /**
   *  Ref:
   *   constructor(param: Partial<FSRSParameters>)
   *   this.intervalModifier = 9 * (1 / this.param.request_retention - 1);
   */
  next_interval(s: number): int {
    const newInterval = this.apply_fuzz(s * this.intervalModifier);
    return Math.min(
      Math.max(Math.round(newInterval), 1),
      this.param.maximum_interval,
    ) as int;
  }

  /**
   * The formula used is :
   * $$next_d = D - w_6 \cdot (R - 2)$$
   * $$D^\prime(D,R) = w_5 \cdot D_0(2) +(1 - w_5) \cdot next_d$$
   * @param d
   * @param g Grade (rating at Anki) [1.again,2.hard,3.good,4.easy]
   * @return next_D
   */
  next_difficulty(d: number, g: number): number {
    const next_d = d - this.param.w[6] * (g - 3);
    return this.constrain_difficulty(
      this.mean_reversion(this.param.w[4], next_d),
    );
  }

  /**
   * The formula used is :
   * $$\min \{\max \{D_0,1\},10\}$$
   */
  constrain_difficulty(difficulty: number) {
    return Math.min(Math.max(Number(difficulty.toFixed(2)), 1), 10);
  }

  /**
   * The formula used is :
   * $$w_7 \cdot init +(1 - w_7) \cdot current$$
   * @param init $$w_2 : D_0(3) = w_2 + (R-2) \cdot w_3= w_2$$
   * @param current $$D - w_6 \cdot (R - 2)$$
   * @return difficulty
   */
  mean_reversion(init: number, current: number): number {
    return this.param.w[7] * init + (1 - this.param.w[7]) * current;
  }

  /**
   * The formula used is :
   * $$S^\prime_r(D,S,R,G) = S\cdot(e^{w_8}\cdot (11-D)\cdot S^{-w_9}\cdot(e^{w_10\cdot(1-R)}-1)\cdot w_15(if G=2) \cdot w_16(if G=4)+1)$$
   * @param d Difficulty D \in [1,10]
   * @param s Stability (interval when R=90%)
   * @param r Retrievability (probability of recall)
   * @param g Grade (Rating[0.again,1.hard,2.good,3.easy])
   * @return S^\prime_r new stability after recall
   */
  next_recall_stability(d: number, s: number, r: number, g: Rating): number {
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
   * @param d Difficulty D \in [1,10]
   * @param s Stability (interval when R=90%)
   * @param r Retrievability (probability of recall)
   * @return S^\prime_f new stability after forgetting
   */
  next_forget_stability(d: number, s: number, r: number): number {
    return (
      this.param.w[11] *
      Math.pow(d, -this.param.w[12]) *
      (Math.pow(s + 1, this.param.w[13]) - 1) *
      Math.exp((1 - r) * this.param.w[14])
    );
  }

  /**
   * The formula used is :
   * $$R(t,S) = (1 + \frac{t}{9 \cdot S})^{-1},$$
   * @param t t days since the last review
   * @param s Stability (interval when R=90%)
   * @return r Retrievability (probability of recall)
   */
  current_retrievability(t: number, s: number): number {
    return Math.pow(1 + t / (9 * s), -1);
  }
}
