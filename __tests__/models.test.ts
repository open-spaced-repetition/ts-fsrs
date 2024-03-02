import {
  Rating,
  RatingType,
  State,
  StateType,
  generatorParameters,
  createEmptyCard,
} from "../src/fsrs";

describe("State", () => {
  it("use State.New", () => {
    expect(State.New).toEqual(0);
    expect(0).toEqual(State.New);
    expect(State[State.New]).toEqual("New");
    expect((0 as State).valueOf()).toEqual(0);
    expect(State["New" as StateType]).toEqual(0);
  });

  it("use State.Learning", () => {
    expect(State.Learning).toEqual(1);
    expect(1).toEqual(State.Learning);
    expect(State[State.Learning]).toEqual("Learning");
    expect((1 as State).valueOf()).toEqual(1);
    expect(State["Learning" as StateType]).toEqual(1);
  });

  it("use State.Review", () => {
    expect(State.Review).toEqual(2);
    expect(2).toEqual(State.Review);
    expect(State[State.Review]).toEqual("Review");
    expect((2 as State).valueOf()).toEqual(2);
    expect(State["Review" as StateType]).toEqual(2);
  });

  it("use State.Relearning", () => {
    expect(State.Relearning).toEqual(3);
    expect(3).toEqual(State.Relearning);
    expect(State[State.Relearning]).toEqual("Relearning");
    expect((3 as State).valueOf()).toEqual(3);
    expect(State["Relearning" as StateType]).toEqual(3);
  });
});

describe("Rating", () => {
  it("use Rating.Again", () => {
    expect(Rating.Again).toEqual(1);
    expect(1).toEqual(Rating.Again);
    expect(Rating[Rating.Again]).toEqual("Again");
    expect((1 as Rating).valueOf()).toEqual(1);
    expect(Rating["Again" as RatingType]).toEqual(1);
  });

  it("use Rating.Hard", () => {
    expect(Rating.Hard).toEqual(2);
    expect(2).toEqual(Rating.Hard);
    expect(Rating[Rating.Hard]).toEqual("Hard");
    expect((2 as Rating).valueOf()).toEqual(2);
    expect(Rating["Hard" as RatingType]).toEqual(2);
  });

  it("use Rating.Good", () => {
    expect(Rating.Good).toEqual(3);
    expect(3).toEqual(Rating.Good);
    expect(Rating[Rating.Good]).toEqual("Good");
    expect((3 as Rating).valueOf()).toEqual(3);
    expect(Rating["Good" as RatingType]).toEqual(3);
  });

  it("use Rating.Easy", () => {
    expect(Rating.Easy).toEqual(4);
    expect(4).toEqual(Rating.Easy);
    expect(Rating[Rating.Easy]).toEqual("Easy");
    expect((4 as Rating).valueOf()).toEqual(4);
    expect(Rating["Easy" as RatingType]).toEqual(4);
  });
});

describe("default FSRSParameters", () => {
  // const env = envParams;
  const params = generatorParameters();
  const w_v4 = [
    0.5701, 1.4436, 4.1386, 10.9355, 5.1443, 1.2006, 0.8627, 0.0362, 1.629,
    0.1342, 1.0166, 2.1174, 0.0839, 0.3204, 1.4676, 0.219, 2.8237,
  ];
  it("default_request_retention", () => {
    expect(0.9).toEqual(params.request_retention);
  });
  it("default_maximum_interval", () => {
    expect(36500).toEqual(params.maximum_interval);
  });
  it("default_w ", () => {
    expect(w_v4).toEqual(params.w);
  });
  it("default_enable_fuzz ", () => {
    expect(false).toEqual(params.enable_fuzz);
  });
});

describe("default Card", () => {
  it("empty card", () => {
    const now = new Date();
    const card = createEmptyCard(now);
    expect(card.due).toEqual(now);
    expect(card.stability).toEqual(0);
    expect(card.difficulty).toEqual(0);
    expect(card.elapsed_days).toEqual(0);
    expect(card.scheduled_days).toEqual(0);
    expect(card.reps).toEqual(0);
    expect(card.lapses).toEqual(0);
    expect(card.state).toEqual(0);
  });
  it("empty card", () => {
    const now = new Date("2023-10-3 00:00:00");
    const card = createEmptyCard();
    expect(card.due).not.toEqual(now);
    expect(card.stability).toEqual(0);
    expect(card.difficulty).toEqual(0);
    expect(card.elapsed_days).toEqual(0);
    expect(card.scheduled_days).toEqual(0);
    expect(card.reps).toEqual(0);
    expect(card.lapses).toEqual(0);
    expect(card.state).toEqual(0);
  });
});
