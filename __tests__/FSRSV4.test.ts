import {
  fsrs,
  Rating,
  generatorParameters,
  FSRS,
  createEmptyCard,
  State,
} from "../src/fsrs";

describe("initial FSRS V4", () => {
  const params = generatorParameters();
  const f: FSRS = fsrs(params);
  const Ratings = Object.keys(Rating)
    .filter((key) => !isNaN(Number(key)))
    .map((key) => Number(key) as Rating);
  it("initial stability ", () => {
    Ratings.forEach((grade) => {
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
    Ratings.forEach((grade) => {
      const s = f.init_difficulty(grade);
      expect(s).toEqual(params.w[4] - (grade - 3) * params.w[5]);
    });
  });
  it("good D0(3) ", () => {
    expect(f.init_difficulty(Rating.Good)).toEqual(params.w[4]);
  });

  it("retrievability t=s ", () => {
    expect(Number(f.current_retrievability(5, 5).toFixed(2))).toEqual(0.9);
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
  it("ivl_history", () => {
    let card = createEmptyCard();
    let now = new Date(2022, 11, 29, 12, 30, 0, 0);
    let scheduling_cards = f.repeat(card, now);
    const ratings = [
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
    const grades = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy];

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
    expect(lapses).toEqual([1, 0, 0, 0]);
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
