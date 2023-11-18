import { Grades, Rating } from "../src/fsrs";

test("FSRS-Grades", () => {
  expect(Grades).toStrictEqual([Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]);
});
