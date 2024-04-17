import {
  fsrs,
  Rating,
  FSRS,
  createEmptyCard,
  State,
  Grade,
  Grades,
} from "../src/fsrs";

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
    expect(difficulty).toEqual([8.4348, 6.8686, 5.3024, 3.7362]);
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
    const card = createEmptyCard("2023-12-01 04:00:00");
    const sc = fsrs.repeat(card, "2023-12-01 04:05:00");
    const r = [undefined, undefined, undefined, "90.00%"];
    const r_number = [undefined, undefined, undefined, 0.9];
    Grades.forEach((grade, index) => {
      expect(fsrs.get_retrievability(sc[grade].card, sc[grade].card.due)).toBe(
        r[index],
      );
      expect(
        fsrs.get_retrievability(sc[grade].card, sc[grade].card.due, false),
      ).toBe(r_number[index]);
    });
  });
});
