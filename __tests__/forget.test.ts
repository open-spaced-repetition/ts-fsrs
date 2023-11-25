import { createEmptyCard, fsrs, FSRS, Rating } from "../src/fsrs";
import { Grade } from "../src/fsrs/models";

describe("FSRS forget", () => {
  const f: FSRS = fsrs({
    w: [
      1.14, 1.01, 5.44, 14.67, 5.3024, 1.5662, 1.2503, 0.0028, 1.5489, 0.1763,
      0.9953, 2.7473, 0.0179, 0.3105, 0.3976, 0.0, 2.0902,
    ],
    enable_fuzz: false,
  });
  it("forget", () => {
    const card = createEmptyCard();
    const now = new Date(2022, 11, 29, 12, 30, 0, 0);
    const forget_now = new Date(2023, 11, 30, 12, 30, 0, 0);
    const scheduling_cards = f.repeat(card, now);
    const grades: Grade[] = [
      Rating.Again,
      Rating.Hard,
      Rating.Good,
      Rating.Easy,
    ];
    for (const grade of grades) {
      const forgetCard = f.forget(
        scheduling_cards[grade].card,
        forget_now,
        true,
      );
      expect(forgetCard.card).toEqual({
        ...card,
        due: forget_now,
        lapses: 0,
        reps: 0,
        last_review: scheduling_cards[grade].card.last_review,
      });
      expect(forgetCard.log.rating).toEqual(Rating.Manual);
      expect(() => f.rollback(forgetCard.card, forgetCard.log)).toThrowError(
        "Cannot rollback a manual rating",
      );
    }
    for (const grade of grades) {
      const forgetCard = f.forget(scheduling_cards[grade].card, forget_now);
      expect(forgetCard.card).toEqual({
        ...card,
        due: forget_now,
        lapses: scheduling_cards[grade].card.lapses,
        reps: scheduling_cards[grade].card.reps,
        last_review: scheduling_cards[grade].card.last_review,
      });
      expect(forgetCard.log.rating).toEqual(Rating.Manual);
      expect(() => f.rollback(forgetCard.card, forgetCard.log)).toThrowError(
        "Cannot rollback a manual rating",
      );
    }
  });

  it("new card forget[reset true]", () => {
    const card = createEmptyCard();
    const forget_now = new Date(2023, 11, 30, 12, 30, 0, 0);
    const forgetCard = f.forget(card, forget_now, true);
    expect(forgetCard.card).toEqual({
      ...card,
      due: forget_now,
      lapses: 0,
      reps: 0,
    });
  });
  it("new card forget[reset true]", () => {
    const card = createEmptyCard();
    const forget_now = new Date(2023, 11, 30, 12, 30, 0, 0);
    const forgetCard = f.forget(card, forget_now);
    expect(forgetCard.card).toEqual({
      ...card,
      due: forget_now,
    });
  });
});
