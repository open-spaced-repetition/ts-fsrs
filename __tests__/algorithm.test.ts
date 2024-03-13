import { fsrs, FSRS, generatorParameters, get_fuzz_range } from "../src/fsrs";

describe("next_interval", () => {
  const DECAY: number = -0.5;
  const FACTOR: number = Math.pow(0.9, 1 / DECAY) - 1;

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
      s * intervalModifier,
      t_fuzz,
      params.maximum_interval,
    );
    expect(next_ivl_fuzz).toBeGreaterThanOrEqual(min_ivl);
    expect(next_ivl_fuzz).toBeLessThanOrEqual(params.maximum_interval);
  });
});
