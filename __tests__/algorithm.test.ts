import {
  DECAY,
  default_maximum_interval,
  FACTOR,
  fsrs,
  FSRS,
  FSRSAlgorithm,
  generatorParameters,
  get_fuzz_range,
  Grades,
  Rating,
} from "../src/fsrs";
import Decimal from "decimal.js";

describe("FACTOR[DECAY = -0.5]", () => {
  it("FACTOR", () => {
    expect(19 / 81).toEqual(new Decimal(19).div(81).toNumber());
    expect(FACTOR).toEqual(new Decimal(19).div(81).toNumber());
    expect(FACTOR).toEqual(
      new Decimal(0.9).pow(new Decimal(1).div(DECAY)).sub(1).toNumber(),
    );
    expect(new Decimal(19).div(81).toNumber()).toEqual(
      new Decimal(0.9).pow(new Decimal(1).div(DECAY)).sub(1).toNumber(),
    );
  });
});

describe("forgetting_curve", () => {
  const params = generatorParameters();
  //w=[
  //   0.5701, 1.4436, 4.1386, 10.9355, 5.1443, 1.2006, 0.8627, 0.0362, 1.629,
  //   0.1342, 1.0166, 2.1174, 0.0839, 0.3204, 1.4676, 0.219, 2.8237,
  // ];
  const algorithm: FSRSAlgorithm = new FSRSAlgorithm(params);

  function forgetting_curve(elapsed_days: number, stability: number): number {
    return +new Decimal(
      new Decimal(1)
        .add(new Decimal(FACTOR).mul(elapsed_days).div(stability))
        .pow(DECAY),
    ).toFixed(8);
  }

  const delta_t = [0, 1, 2, 3, 4, 5];
  const s = [1.0, 2.0, 3.0, 4.0, 4.0, 2.0];
  const collection: number[] = [];
  const expected: number[] = [];
  it("retrievability", () => {
    for (let i = 0; i < delta_t.length; i++) {
      collection.push(algorithm.forgetting_curve(delta_t[i], s[i]));
      expected.push(forgetting_curve(delta_t[i], s[i]));
    }
    expect(collection).toEqual(expected);
    expect(collection).toEqual([
      1.0, 0.946059, 0.9299294, 0.92216794, 0.9, 0.79394596,
    ]);
  });
});

describe("init_ds", () => {
  const params = generatorParameters();
  //w=[
  //   0.5701, 1.4436, 4.1386, 10.9355, 5.1443, 1.2006, 0.8627, 0.0362, 1.629,
  //   0.1342, 1.0166, 2.1174, 0.0839, 0.3204, 1.4676, 0.219, 2.8237,
  // ];
  const algorithm: FSRSAlgorithm = new FSRSAlgorithm(params);
  it("initial stability ", () => {
    const collection: number[] = [];
    Grades.forEach((grade) => {
      const s = algorithm.init_stability(grade);
      collection.push(s);
    });
    expect(collection).toEqual([
      params.w[0],
      params.w[1],
      params.w[2],
      params.w[3],
    ]);
  });
  it("initial difficulty ", () => {
    const collection: number[] = [];
    const expected: number[] = [];
    Grades.forEach((grade) => {
      const d = algorithm.init_difficulty(grade);
      collection.push(d);
      expected.push(
        new Decimal(params.w[4])
          .sub(new Decimal(grade - 3).mul(new Decimal(params.w[5])))
          .toNumber(),
      );
    });
    expect(collection).toEqual(expected);
    // again: w[4]-w[5]*(-2)
    // hard: w[4]-w[5]*(-1)
    // good: w[4]-w[5]*(0)
    // easy: w[4]-w[5]*(1)
  });
});

describe("next_ds", () => {
  const params = generatorParameters();
  //w=[
  //   0.5701, 1.4436, 4.1386, 10.9355, 5.1443, 1.2006, 0.8627, 0.0362, 1.629,
  //   0.1342, 1.0166, 2.1174, 0.0839, 0.3204, 1.4676, 0.219, 2.8237,
  // ];
  const algorithm: FSRSAlgorithm = new FSRSAlgorithm(params);
  it("next_difficulty", () => {
    function next_d(d: number, g: number) {
      function mean_reversion(init: number, current: number): number {
        const f1 = new Decimal(params.w[7]).mul(init);
        const f2 = new Decimal(1).sub(new Decimal(params.w[7])).mul(current);
        return f1.add(f2).toNumber();
      }

      function constrain_difficulty(difficulty: number): number {
        return Math.min(Math.max(+new Decimal(difficulty).toFixed(8), 1), 10);
      }

      const next_d = new Decimal(d)
        .sub(new Decimal(params.w[6]).mul(new Decimal(g - 3)))
        .toNumber();
      return constrain_difficulty(mean_reversion(params.w[4], next_d));
    }

    const collection: number[] = [];
    const expected: number[] = [];
    Grades.forEach((grade) => {
      const d = algorithm.next_difficulty(5.0, grade);
      const expected_d = next_d(5.0, grade);
      collection.push(d);
      expected.push(expected_d);
    });
    expect(collection).toEqual([6.66816418, 5.83669392, 5.00522366, 4.1737534]);
    expect(collection).toEqual(expected);
  });

  it("next_stability", () => {
    function next_forget_stability(d: number, s: number, r: number): number {
      return +new Decimal(params.w[11])
        .mul(new Decimal(d).pow(-params.w[12]))
        .mul(new Decimal(s + 1).pow(params.w[13]).sub(1))
        .mul(new Decimal(Math.exp((1 - r) * params.w[14])))
        .toFixed(8);
    }

    function next_recall_stability(
      d: number,
      s: number,
      r: number,
      g: number,
    ): number {
      const hard_penalty = Rating.Hard === g ? params.w[15] : 1;
      const easy_bound = Rating.Easy === g ? params.w[16] : 1;
      return +new Decimal(s)
        .mul(
          new Decimal(1).add(
            new Decimal(params.w[8])
              .exp()
              .mul(new Decimal(11).sub(d))
              .mul(new Decimal(s).pow(-params.w[9]))
              .mul(
                new Decimal(params.w[10])
                  .mul(new Decimal(1).sub(r))
                  .exp()
                  .sub(1),
              )
              .mul(hard_penalty)
              .mul(easy_bound),
          ),
        )
        .toFixed(8);
    }

    function next_s(d: number, s: number, r: number, g: number) {
      if (g < 1 || g > 4) {
        throw new Error("Invalid grade");
      } else if (g === Rating.Again) {
        return next_forget_stability(d, s, r);
      } else {
        return next_recall_stability(d, s, r, g);
      }
    }

    const s_recall_collection: number[] = [];
    const s_fail_collection: number[] = [];
    const next_s_collection: number[] = [];
    const expected_s_recall: number[] = [];
    const expected_s_fail: number[] = [];
    const expected_next_s: number[] = [];

    const s = [5, 5, 5, 5];
    const d = [1, 2, 3, 4];
    const r = [0.9, 0.8, 0.7, 0.6];
    Grades.forEach((grade, index) => {
      const s_recall = algorithm.next_recall_stability(
        d[index],
        s[index],
        r[index],
        grade,
      );
      const s_fail = algorithm.next_forget_stability(
        d[index],
        s[index],
        r[index],
      );
      s_recall_collection.push(s_recall);
      s_fail_collection.push(s_fail);
      expected_s_fail.push(next_forget_stability(d[index], s[index], r[index]));
      expected_s_recall.push(
        next_recall_stability(d[index], s[index], r[index], grade),
      );
      if (grade === Rating.Again) {
        next_s_collection.push(s_fail);
      } else {
        next_s_collection.push(s_recall);
      }
      expected_next_s.push(next_s(d[index], s[index], r[index], grade));
    });
    expect(s_recall_collection).toEqual([
      26.98093855, 14.12848781, 63.60068241, 208.72742276,
    ]);
    expect(s_recall_collection).toEqual(expected_s_recall);
    expect(s_fail_collection).toEqual([
      1.9016012, 2.0777825, 2.3257503, 2.62916465,
    ]);
    expect(s_fail_collection).toEqual(expected_s_fail);
    expect(next_s_collection).toEqual([
      1.9016012, 14.12848781, 63.60068241, 208.72742276,
    ]);
    expect(next_s_collection).toEqual(expected_next_s);
  });
});

describe("next_interval", () => {
  it("next_ivl", () => {
    const desired_retentions: number[] = Array.from(
      { length: 10 },
      (_, i) => (i + 1) / 10,
    );
    const intervals: number[] = desired_retentions.map((r) =>
      fsrs({ request_retention: r }).next_interval(1.0, 0, false),
    );
    expect(intervals).toEqual([422, 102, 43, 22, 13, 8, 4, 2, 1, 1]);
  });

  // https://github.com/open-spaced-repetition/ts-fsrs/pull/74
  it("next_ivl[max_limit]", () => {
    const params = generatorParameters({ maximum_interval: 365 });
    const intervalModifier =
      (Math.pow(params.request_retention, 1 / DECAY) - 1) / FACTOR;
    const f: FSRS = fsrs(params);

    const s = 737.47;
    const next_ivl = f.next_interval(s, 0, false);
    expect(next_ivl).toEqual(params.maximum_interval);

    const t_fuzz = 98;
    const next_ivl_fuzz = f.next_interval(s, t_fuzz, true);
    const { min_ivl, max_ivl } = get_fuzz_range(
      Math.round(s * intervalModifier),
      t_fuzz,
      params.maximum_interval,
    );
    expect(next_ivl_fuzz).toBeGreaterThanOrEqual(min_ivl);
    expect(max_ivl).toBe(params.maximum_interval);
    expect(next_ivl_fuzz).toBeLessThanOrEqual(max_ivl);
  });
});

describe("FSRS apply_fuzz", () => {
  test("return original interval when fuzzing is disabled", () => {
    const ivl = 3.2;
    const enable_fuzz = false;
    const algorithm = new FSRS({ enable_fuzz: enable_fuzz });
    expect(algorithm.apply_fuzz(ivl, 0)).toBe(3);
  });

  test("return original interval when ivl is less than 2.5", () => {
    const ivl = 2.3;
    const enable_fuzz = true;
    const algorithm = new FSRS({ enable_fuzz: enable_fuzz });
    expect(algorithm.apply_fuzz(ivl, 0)).toBe(2);
  });

  test("return original interval when ivl is less than 2.5", () => {
    const ivl = 2.5;
    const enable_fuzz = true;
    const algorithm = new FSRSAlgorithm({ enable_fuzz: enable_fuzz });
    const { min_ivl, max_ivl } = get_fuzz_range(
      Math.round(2.5),
      0,
      default_maximum_interval,
    );
    const fuzzedInterval = algorithm.apply_fuzz(ivl, 0);
    expect(fuzzedInterval).toBeGreaterThanOrEqual(min_ivl);
    expect(fuzzedInterval).toBeLessThanOrEqual(max_ivl);
  });
});
