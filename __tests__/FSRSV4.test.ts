import {
  fsrs,
  Rating,
  generatorParameters,
  FSRS,
  createEmptyCard,
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
  const grade = [Rating.Again, Rating.Hard, Rating.Good,Rating.Easy];
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
      for (const check of grade) {
        const rollbackCard = f.rollback(
            scheduling_cards[check].card,
            scheduling_cards[check].log,
        );
        expect(rollbackCard).toEqual(card);
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
});
