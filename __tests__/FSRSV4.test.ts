import {
  fsrs,
  Rating,
  RatingType,
  generatorParameters,
  StateType,
  State,
  FSRS,
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

  it('retrievability t=s ', () => {
    expect(f.current_retrievability(5,5)).toEqual(0.90);
  });
});
