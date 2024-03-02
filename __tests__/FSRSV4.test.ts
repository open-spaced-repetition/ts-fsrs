import {
  fsrs,
  Rating,
  generatorParameters,
  FSRS,
  createEmptyCard,
  State,
  Grade,
  Grades, default_request_retention, default_maximum_interval, default_enable_fuzz, default_w,
} from "../src/fsrs";
import { FSRSAlgorithm } from "../src/fsrs/algorithm";

describe("initial FSRS V4", () => {
  const params = generatorParameters();
  const f: FSRS = fsrs(params);
  it("initial stability ", () => {
    Grades.forEach((grade) => {
      const s = f.init_stability(grade);
      expect(s).toEqual(params.w[grade - 1]);
    });
  });
  it("again s0(1) ", () => {
    expect(f.init_stability(Rating.Again)).toEqual(params.w[0]);
  });
  it("initial s0(4) ", () => {
    expect(f.init_stability(Rating.Easy)).toEqual(params.w[3]);
  });

  it("initial difficulty ", () => {
    Grades.forEach((grade) => {
      const s = f.init_difficulty(grade);
      expect(s).toEqual(params.w[4] - (grade - 3) * params.w[5]);
    });
  });
  it("good D0(3) ", () => {
    expect(f.init_difficulty(Rating.Good)).toEqual(params.w[4]);
  });

  it("retrievability t=s ", () => {
    expect(Number(f.forgetting_curve(5, 5).toFixed(2))).toEqual(0.9);
  });

  it("default params",()=>{
    const expected_w = [
      0.5701, 1.4436, 4.1386, 10.9355, 5.1443, 1.2006, 0.8627, 0.0362, 1.629,
      0.1342, 1.0166, 2.1174, 0.0839, 0.3204, 1.4676, 0.219, 2.8237,
    ];
    expect(default_request_retention).toEqual(0.9);
    expect(default_maximum_interval).toEqual(36500);
    expect(default_enable_fuzz).toEqual(false)
    expect(default_w).toEqual(expected_w);
    expect(default_w.length).toBe(expected_w.length);
  })
});

describe("FSRS apply_fuzz", () => {
  test("return original interval when fuzzing is disabled", () => {
    const ivl = 3.0;
    const enable_fuzz = false;
    const algorithm = new FSRS({ enable_fuzz: enable_fuzz });
    expect(algorithm.apply_fuzz(ivl)).toBe(3);
  });

  test("return original interval when ivl is less than 2.5", () => {
    const ivl = 2.0;
    const enable_fuzz = true;
    const algorithm = new FSRS({ enable_fuzz: enable_fuzz });
    expect(algorithm.apply_fuzz(ivl)).toBe(2);
  });

  test("return original interval when ivl is less than 2.5", () => {
    const ivl = 2.5;
    const enable_fuzz = true;
    const algorithm = new FSRSAlgorithm({ enable_fuzz: enable_fuzz });
    const min_ivl = Math.max(2, Math.round(ivl * 0.95 - 1));
    const max_ivl = Math.round(ivl * 1.05 + 1);
    const fuzzedInterval = algorithm.apply_fuzz(ivl);
    expect(fuzzedInterval).toBeGreaterThanOrEqual(min_ivl);
    expect(fuzzedInterval).toBeLessThanOrEqual(max_ivl);
  });
});

// Ref: https://github.com/open-spaced-repetition/py-fsrs/blob/ecd68e453611eb808c7367c7a5312d7cadeedf5c/tests/test_fsrs.py#L1
describe("FSRS V4 AC by py-fsrs", () => {
  const f: FSRS = fsrs({
    w: [
      1.14, 1.01, 5.44, 14.67, 5.3024, 1.5662, 1.2503, 0.0028, 1.5489, 0.1763,
      0.9953, 2.7473, 0.0179, 0.3105, 0.3976, 0.0, 2.0902,
    ],
    enable_fuzz: false,
  });
  const grade: Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy];
  it("ivl_history", () => {
    let card = createEmptyCard();
    let now = new Date(2022, 11, 29, 12, 30, 0, 0);
    let scheduling_cards = f.repeat(card, now);
    const ratings: Grade[] = [
      Rating.Good,
      Rating.Good,
      Rating.Good,
      Rating.Good,
      Rating.Good,
      Rating.Good,
      Rating.Again,
      Rating.Again,
      Rating.Good,
      Rating.Good,
      Rating.Good,
      Rating.Good,
      Rating.Good,
    ];
    const ivl_history: number[] = [];
    for (const rating of ratings) {
      for (const check of grade) {
        const rollbackCard = f.rollback(
          scheduling_cards[check].card,
          scheduling_cards[check].log,
        );
        expect(rollbackCard).toEqual(card);
        expect(scheduling_cards[check].log.elapsed_days).toEqual(
          card.last_review ? now.diff(card.last_review as Date, "days") : 0,
        );
      }
      card = scheduling_cards[rating].card;
      const ivl = card.scheduled_days;
      ivl_history.push(ivl);
      now = card.due;
      scheduling_cards = f.repeat(card, now);
    }

    expect(ivl_history).toEqual([
      0, 5, 16, 43, 106, 236, 0, 0, 12, 25, 47, 85, 147,
    ]);
  });

  it("first repeat", () => {
    const card = createEmptyCard();
    const now = new Date(2022, 11, 29, 12, 30, 0, 0);
    const scheduling_cards = f.repeat(card, now);
    const grades: Grade[] = [
      Rating.Again,
      Rating.Hard,
      Rating.Good,
      Rating.Easy,
    ];

    const stability: number[] = [];
    const difficulty: number[] = [];
    const elapsed_days: number[] = [];
    const scheduled_days: number[] = [];
    const reps: number[] = [];
    const lapses: number[] = [];
    const states: State[] = [];
    for (const rating of grades) {
      const first_card = scheduling_cards[rating].card;
      stability.push(first_card.stability);
      difficulty.push(first_card.difficulty);
      reps.push(first_card.reps);
      lapses.push(first_card.lapses);
      elapsed_days.push(first_card.elapsed_days);
      scheduled_days.push(first_card.scheduled_days);
      states.push(first_card.state);
    }
    expect(stability).toEqual([1.14, 1.01, 5.44, 14.67]);
    expect(difficulty).toEqual([8.4348, 6.8686, 5.3024, 3.7361999999999993]);
    expect(reps).toEqual([1, 1, 1, 1]);
    expect(lapses).toEqual([0, 0, 0, 0]);
    expect(elapsed_days).toEqual([0, 0, 0, 0]);
    expect(scheduled_days).toEqual([0, 0, 0, 15]);
    expect(states).toEqual([
      State.Learning,
      State.Learning,
      State.Learning,
      State.Review,
    ]);
  });
});

describe("get retrievability", () => {
  const fsrs = new FSRS({});
  test("return undefined for non-review cards", () => {
    const card = createEmptyCard();
    const now = new Date();
    const expected = undefined;
    expect(fsrs.get_retrievability(card, now)).toBe(expected);
  });

  test("return retrievability percentage for review cards", () => {
    const card = createEmptyCard();
    const sc = fsrs.repeat(card, new Date());
    const r = [undefined, undefined, undefined, "100.00%"];
    Grades.forEach((grade,index) => {
      expect(fsrs.get_retrievability(sc[grade].card, new Date())).toBe(r[index]);
    });
  });
});
