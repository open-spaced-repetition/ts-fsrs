import {
  date_diff, date_scheduler,
  fixDate,
  fixRating,
  fixState,
  formatDate,
  Grades,
  Rating,
  State,
} from "../src/fsrs";

test("FSRS-Grades", () => {
  expect(Grades).toStrictEqual([
    Rating.Again,
    Rating.Hard,
    Rating.Good,
    Rating.Easy,
  ]);
});

test("Date.prototype.format", () => {
  const now = new Date(2022, 11, 30, 12, 30, 0, 0);
  const last_review = new Date(2022, 11, 29, 12, 30, 0, 0);
  expect(now.format()).toEqual("2022-12-30 12:30:00");
  expect(formatDate(now)).toEqual("2022-12-30 12:30:00");
  const TIMEUNITFORMAT_TEST = ["秒", "分", "时", "天", "月", "年"];
  expect(now.dueFormat(last_review)).toEqual("1");
  expect(now.dueFormat(last_review, true)).toEqual("1day");
  expect(now.dueFormat(last_review, true, TIMEUNITFORMAT_TEST)).toEqual("1天");
});

describe("date_scheduler", () => {
  test("offset by minutes", () => {
    const now = new Date("2023-01-01T12:00:00Z");
    const t = 30;
    const expected = new Date("2023-01-01T12:30:00Z");

    expect(date_scheduler(now, t)).toEqual(expected);
  });

  test("offset by days", () => {
    const now = new Date("2023-01-01T12:00:00Z");
    const t = 3;
    const expected = new Date("2023-01-04T12:00:00Z");

    expect(date_scheduler(now, t, true)).toEqual(expected);
  });

  test("negative offset", () => {
    const now = new Date("2023-01-01T12:00:00Z");
    const t = -15;
    const expected = new Date("2023-01-01T11:45:00Z");

    expect(date_scheduler(now, t)).toEqual(expected);
  });

  test("offset with isDay parameter", () => {
    const now = new Date("2023-01-01T12:00:00Z");
    const t = 2;
    const expected = new Date("2023-01-03T12:00:00Z");

    expect(date_scheduler(now, t, true)).toEqual(expected);
  });
});

describe("date_diff", () => {
  test("wrong fix", () => {
    const now = new Date(2022, 11, 30, 12, 30, 0, 0);
    const last_review = new Date(2022, 11, 29, 12, 30, 0, 0);

    expect(() => date_diff(now, null as unknown as Date, "days")).toThrowError(
      "Invalid date",
    );
    expect(() =>
      date_diff(now, null as unknown as Date, "minutes"),
    ).toThrowError("Invalid date");
    expect(() =>
      date_diff(null as unknown as Date, last_review, "days"),
    ).toThrowError("Invalid date");
    expect(() =>
      date_diff(null as unknown as Date, last_review, "minutes"),
    ).toThrowError("Invalid date");
  });

  test("calculate difference in minutes", () => {
    const now = new Date("2023-11-25T12:30:00Z");
    const pre = new Date("2023-11-25T12:00:00Z");
    const unit = "minutes";
    const expected = 30;
    expect(date_diff(now, pre, unit)).toBe(expected);
  });

  test("calculate difference in minutes for negative time difference", () => {
    const now = new Date("2023-11-25T12:00:00Z");
    const pre = new Date("2023-11-25T12:30:00Z");
    const unit = "minutes";
    const expected = -30;
    expect(date_diff(now, pre, unit)).toBe(expected);
  });
});

describe("fixDate", () => {
  test("throw error for invalid date value", () => {
    const input = "invalid-date";
    expect(() => fixDate(input)).toThrowError("Invalid date:[invalid-date]");
  });

  test("throw error for unsupported value type", () => {
    const input = true;
    expect(() => fixDate(input)).toThrowError("Invalid date:[true]");
  });

  test("throw error for undefined value", () => {
    const input = undefined;
    expect(() => fixDate(input)).toThrowError("Invalid date:[undefined]");
  });

  test("throw error for null value", () => {
    const input = null;
    expect(() => fixDate(input)).toThrowError("Invalid date:[null]");
  });
});

describe("fixState", () => {
  test("fix state value", () => {
    const newState = "New";
    expect(fixState("new")).toEqual(State.New);
    expect(fixState(newState)).toEqual(State.New);

    const learning = "Learning";
    expect(fixState("learning")).toEqual(State.Learning);
    expect(fixState(learning)).toEqual(State.Learning);

    const relearning = "Relearning";
    expect(fixState("relearning")).toEqual(State.Relearning);
    expect(fixState(relearning)).toEqual(State.Relearning);

    const review = "Review";
    expect(fixState("review")).toEqual(State.Review);
    expect(fixState(review)).toEqual(State.Review);
  });

  test("throw error for invalid state value", () => {
    const input = "invalid-state";
    expect(() => fixState(input)).toThrowError("Invalid state:[invalid-state]");
    expect(() => fixState(null)).toThrowError("Invalid state:[null]");
    expect(() => fixState(undefined)).toThrowError("Invalid state:[undefined]");
  });
});

describe("fixRating", () => {
  test("fix Rating value", () => {
    const again = "Again";
    expect(fixRating("again")).toEqual(Rating.Again);
    expect(fixRating(again)).toEqual(Rating.Again);

    const hard = "Hard";
    expect(fixRating("hard")).toEqual(Rating.Hard);
    expect(fixRating(hard)).toEqual(Rating.Hard);

    const good = "Good";
    expect(fixRating("good")).toEqual(Rating.Good);
    expect(fixRating(good)).toEqual(Rating.Good);

    const easy = "Easy";
    expect(fixRating("easy")).toEqual(Rating.Easy);
    expect(fixRating(easy)).toEqual(Rating.Easy);
  });

  test("throw error for invalid rating value", () => {
    const input = "invalid-rating";
    expect(() => fixRating(input)).toThrowError(
      "Invalid rating:[invalid-rating]",
    );
    expect(() => fixRating(null)).toThrowError("Invalid rating:[null]");
    expect(() => fixRating(undefined)).toThrowError(
      "Invalid rating:[undefined]",
    );
  });
});
