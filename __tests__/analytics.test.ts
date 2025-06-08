import { Card, State } from '../src/fsrs/models';
import {
  calculateCardDistribution,
  forecastReviewLoad,
  identifyProblematicCards,
  calculateMatureCards,
} from '../src/fsrs/analytics';
import { createEmptyCard } from '../src/fsrs/default';

describe('Analytics Functions', () => {
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0); // Use a fixed time for predictable tests

  const createCard = (
    state: State,
    due: Date,
    lapses: number = 0,
    stability: number = 0
  ): Card => ({
    ...createEmptyCard(due),
    state,
    lapses,
    stability,
    last_review: state === State.New ? undefined : new Date(due.getTime() - 24*60*60*1000), // dummy last_review if not new
  });

  describe('calculateCardDistribution', () => {
    it('should return all zeros for an empty array', () => {
      const distribution = calculateCardDistribution([]);
      expect(distribution).toEqual({
        [State.New]: 0,
        [State.Learning]: 0,
        [State.Review]: 0,
        [State.Relearning]: 0,
      });
    });

    it('should correctly count cards in various states', () => {
      const cards: Card[] = [
        createCard(State.New, baseDate),
        createCard(State.Learning, baseDate),
        createCard(State.Learning, baseDate),
        createCard(State.Review, baseDate),
        createCard(State.Review, baseDate),
        createCard(State.Review, baseDate),
        createCard(State.Relearning, baseDate),
      ];
      const distribution = calculateCardDistribution(cards);
      expect(distribution).toEqual({
        [State.New]: 1,
        [State.Learning]: 2,
        [State.Review]: 3,
        [State.Relearning]: 1,
      });
    });
  });

  describe('forecastReviewLoad', () => {
    // No longer mocking Date.now, pass mockToday directly
    const mockToday = new Date('2023-11-15T00:00:00.000Z'); // Fixed "today"

    // beforeAll(() => {
    //   // dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => mockToday.getTime());
    // });

    // afterAll(() => {
    //   // dateNowSpy.mockRestore();
    // });

    const createForecastCard = (daysFromToday: number, referenceDate: Date = mockToday): Card => {
        const dueDate = new Date(referenceDate);
        dueDate.setDate(referenceDate.getDate() + daysFromToday);
        return createCard(State.Review, dueDate);
    };


    it('should return all zeros for an empty array', () => {
      const load = forecastReviewLoad([], mockToday);
      expect(load).toEqual({ today: 0, next7Days: 0, next30Days: 0 });
    });

    it('should correctly count cards due today, within 7 days, and within 30 days', () => {
      const cards: Card[] = [
        createForecastCard(0, mockToday), // today
        createForecastCard(0, mockToday), // today (another one, due 11:59 PM)
        createForecastCard(1, mockToday), // tomorrow
        createForecastCard(6, mockToday), // 6 days from today
        createForecastCard(7, mockToday), // 7 days from today (should be outside next7Days)
        createForecastCard(29, mockToday), // 29 days from today
        createForecastCard(30, mockToday), // 30 days from today (should be outside next30Days)
        createForecastCard(40, mockToday), // 40 days from today
      ];
      cards[1].due.setHours(23,59,59,999); // ensure end of day is still "today"

      const load = forecastReviewLoad(cards, mockToday);
      expect(load.today).toBe(2);
      expect(load.next7Days).toBe(4); // today, today, +1, +6
      expect(load.next30Days).toBe(6); // today, today, +1, +6, +7, +29
    });

     it('should handle edge case: card due at 11:59 PM today vs 12:01 AM tomorrow', () => {
      const cardToday = createForecastCard(0, mockToday);
      cardToday.due.setHours(23, 59, 0, 0);

      const cardTomorrow = createForecastCard(1, mockToday);
      cardTomorrow.due.setHours(0, 1, 0, 0);

      const cards = [cardToday, cardTomorrow];
      const load = forecastReviewLoad(cards, mockToday);
      expect(load.today).toBe(1);
      expect(load.next7Days).toBe(2); // cardToday, cardTomorrow
      expect(load.next30Days).toBe(2);
    });
  });

  describe('identifyProblematicCards', () => {
    it('should return an empty array if no cards meet criteria', () => {
      const cards = [createCard(State.Review, baseDate, 2), createCard(State.Review, baseDate, 4)];
      expect(identifyProblematicCards(cards)).toEqual([]);
    });

    it('should identify cards with lapses >= minLapses (default 5)', () => {
      const card1 = createCard(State.Review, baseDate, 5);
      const card2 = createCard(State.Learning, baseDate, 7);
      const card3 = createCard(State.Review, baseDate, 3);
      const cards = [card1, card2, card3];
      expect(identifyProblematicCards(cards)).toEqual([card1, card2]);
    });

    it('should use custom minLapses', () => {
      const card1 = createCard(State.Review, baseDate, 2);
      const card2 = createCard(State.Learning, baseDate, 3);
      const card3 = createCard(State.Review, baseDate, 1);
      const cards = [card1, card2, card3];
      expect(identifyProblematicCards(cards, 2)).toEqual([card1, card2]);
    });
  });

  describe('calculateMatureCards', () => {
    it('should return zero counts and empty arrays for an empty input array', () => {
      const result = calculateMatureCards([]);
      expect(result).toEqual({
        matureCount: 0,
        youngCount: 0,
        matureCards: [],
        youngCards: [],
      });
    });

    it('should correctly classify cards with default threshold (21)', () => {
      const matureCard1 = createCard(State.Review, baseDate, 0, 21);
      const matureCard2 = createCard(State.Review, baseDate, 0, 30);
      const youngCard1_lowStability = createCard(State.Review, baseDate, 0, 20);
      const youngCard2_notReview = createCard(State.Learning, baseDate, 0, 25);
      const youngCard3_new = createCard(State.New, baseDate, 0, 0);

      const cards = [matureCard1, matureCard2, youngCard1_lowStability, youngCard2_notReview, youngCard3_new];
      const result = calculateMatureCards(cards);

      expect(result.matureCount).toBe(2);
      expect(result.youngCount).toBe(3);
      expect(result.matureCards).toEqual([matureCard1, matureCard2]);
      expect(result.youngCards).toEqual([youngCard1_lowStability, youngCard2_notReview, youngCard3_new]);
    });

    it('should use custom matureStabilityThreshold', () => {
      const matureCard_custom = createCard(State.Review, baseDate, 0, 15);
      const youngCard_custom = createCard(State.Review, baseDate, 0, 14);

      const cards = [matureCard_custom, youngCard_custom];
      const result = calculateMatureCards(cards, 15);

      expect(result.matureCount).toBe(1);
      expect(result.youngCount).toBe(1);
      expect(result.matureCards).toEqual([matureCard_custom]);
      expect(result.youngCards).toEqual([youngCard_custom]);
    });
  });
});
