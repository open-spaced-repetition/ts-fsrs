import { Card, State, StateType } from '../src/fsrs/models';
import { exportCardsToJson, importCardsFromJson, JsonCard } from '../src/fsrs/io';
import { createEmptyCard } from '../src/fsrs/default';

describe('Card Import/Export to JSON', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  const baseDate = new Date('2023-10-01T10:00:00.000Z');
  const card1: Card = {
    ...createEmptyCard(baseDate),
    stability: 5,
    difficulty: 3,
    state: State.Review,
    last_review: new Date('2023-09-25T10:00:00.000Z'),
    elapsed_days: 6, // Deprecated
  };

  const card2: Card = {
    ...createEmptyCard(new Date(baseDate.getTime() + 24 * 60 * 60 * 1000)), // due next day
    stability: 2.5,
    difficulty: 1.2,
    state: State.Learning,
    learning_steps: 1,
    reps: 1,
    lapses: 0,
    // no last_review
  };

  const card3_New: Card = { // card that was never reviewed, last_review is undefined
    ...createEmptyCard(new Date(baseDate.getTime() + 48 * 60 * 60 * 1000)),
    stability: 0,
    difficulty: 0,
    state: State.New,
    elapsed_days: 0,
  };


  const jsonCard1: JsonCard = {
    due: baseDate.toISOString(),
    stability: 5,
    difficulty: 3,
    // elapsed_days is added conditionally last in export, so adjust order for test
    scheduled_days: 0,
    learning_steps: 0,
    reps: 0,
    lapses: 0,
    state: 'Review',
    last_review: new Date('2023-09-25T10:00:00.000Z').toISOString(),
    elapsed_days: 6, // Moved to match typical export order
  };

  const jsonCard2: JsonCard = {
    due: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    stability: 2.5,
    difficulty: 1.2,
    elapsed_days: 0, // default from createEmptyCard
    scheduled_days: 0,
    learning_steps: 1,
    reps: 1,
    lapses: 0,
    state: 'Learning',
    last_review: null, // or undefined, export will make it null
  };

   const jsonCard3_New: JsonCard = {
    due: new Date(baseDate.getTime() + 48 * 60 * 60 * 1000).toISOString(),
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: 0,
    lapses: 0,
    state: 'New',
    last_review: null, // or undefined, export will make it null
  };

  describe('exportCardsToJson', () => {
    it('should export an empty array', () => {
      expect(exportCardsToJson([])).toBe('[]');
    });

    it('should export a single card correctly (with last_review and elapsed_days)', () => {
      const json = exportCardsToJson([card1]);
      const parsed = JSON.parse(json);
      expect(parsed).toEqual([jsonCard1]);
    });

    it('should export a single card correctly (without last_review, default elapsed_days)', () => {
      const json = exportCardsToJson([card2]);
      const parsed = JSON.parse(json);
      // elapsed_days is non-optional in Card, so it will be exported (as 0 if not set)
      expect(parsed).toEqual([{...jsonCard2, elapsed_days: card2.elapsed_days }]);
    });

    it('should export a new card correctly (without last_review)', () => {
      const json = exportCardsToJson([card3_New]);
      const parsed = JSON.parse(json);
      expect(parsed).toEqual([{...jsonCard3_New, elapsed_days: card3_New.elapsed_days}]);
    });

    it('should export multiple cards', () => {
      const json = exportCardsToJson([card1, card2, card3_New]);
      const parsed = JSON.parse(json);
      expect(parsed).toEqual([jsonCard1, {...jsonCard2, elapsed_days: card2.elapsed_days}, {...jsonCard3_New, elapsed_days: card3_New.elapsed_days}]);
    });

    it('should pretty print with 2 spaces', () => {
      const json = exportCardsToJson([card1]);
      expect(json).toBe(JSON.stringify([jsonCard1], null, 2));
    });
  });

  describe('importCardsFromJson', () => {
    it('should import an empty array', () => {
      expect(importCardsFromJson('[]')).toEqual([]);
    });

    it('should import a single card correctly (with last_review and elapsed_days)', () => {
      const cards = importCardsFromJson(JSON.stringify([jsonCard1]));
      expect(cards).toHaveLength(1);
      expect(cards[0]).toEqual(card1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("'elapsed_days' (6)"));
    });

    it('should import a single card correctly (with null last_review, with elapsed_days)', () => {
      const jsonToImportArray = [{ ...jsonCard2, last_review: null, elapsed_days: 5 }]; // card2 has undefined last_review
      const cards = importCardsFromJson(JSON.stringify(jsonToImportArray));
      expect(cards).toHaveLength(1);
      const expectedCard2 = { ...card2, elapsed_days: 5, last_review: undefined }; // import makes last_review undefined if null
      expect(cards[0]).toEqual(expectedCard2);
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("'elapsed_days' (5)"));
    });

    it('should import a new card correctly (null last_review, specific elapsed_days)', () => {
      const jsonToImportArray = [{ ...jsonCard3_New, elapsed_days: 10 }];
      const cards = importCardsFromJson(JSON.stringify(jsonToImportArray));
      expect(cards).toHaveLength(1);
      const expectedCard3 = { ...card3_New, elapsed_days: 10, last_review: undefined };
      expect(cards[0]).toEqual(expectedCard3);
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("'elapsed_days' (10)"));
    });

    it('should import a card and default elapsed_days to 0 if not present in JSON', () => {
      const { elapsed_days, ...jsonCard1WithoutElapsed } = jsonCard1; // remove elapsed_days
      const cards = importCardsFromJson(JSON.stringify([jsonCard1WithoutElapsed]));
      expect(cards).toHaveLength(1);
      // Card type has elapsed_days as non-optional, so import will set it to 0.
      const expectedCard = { ...card1, elapsed_days: 0 };
      expect(cards[0]).toEqual(expectedCard);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });


    it('should import multiple cards', () => {
      const jsonWithElapsed = [
        jsonCard1, // elapsed_days: 6
        { ...jsonCard2, elapsed_days: 3 }, // elapsed_days: 3
        { ...jsonCard3_New, elapsed_days: 0} // elapsed_days: 0
      ];
      const cards = importCardsFromJson(JSON.stringify(jsonWithElapsed));
      expect(cards).toHaveLength(3);
      expect(cards[0]).toEqual(card1); // elapsed_days is 6 in card1
      expect(cards[1]).toEqual({ ...card2, elapsed_days: 3, last_review: undefined });
      expect(cards[2]).toEqual({ ...card3_New, elapsed_days: 0, last_review: undefined });
      expect(consoleWarnSpy).toHaveBeenCalledTimes(3); // Once for each card with elapsed_days
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("'elapsed_days' (6)"));
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("'elapsed_days' (3)"));
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("'elapsed_days' (0)"));
    });

    it('should throw error for malformed JSON', () => {
      expect(() => importCardsFromJson('{')).toThrow("Unexpected end of JSON input");
    });

    it('should throw error if JSON is not an array', () => {
      expect(() => importCardsFromJson('{}')).toThrow("Invalid JSON: input is not an array.");
    });

    const requiredFields: (keyof JsonCard)[] = ['due', 'stability', 'difficulty', 'scheduled_days', 'learning_steps', 'reps', 'lapses', 'state'];
    requiredFields.forEach(field => {
      it(`should throw error if required field '${field}' is missing`, () => {
        const faultyJson = { ...jsonCard1 };
        delete faultyJson[field];
        expect(() => importCardsFromJson(JSON.stringify([faultyJson])))
          .toThrow(new RegExp(`Invalid card at index 0: '${field}' must be a .*`));
      });
    });

    const numericFields: (keyof JsonCard)[] = ['stability', 'difficulty', 'scheduled_days', 'learning_steps', 'reps', 'lapses'];
    numericFields.forEach(field => {
        it(`should throw error if numeric field '${field}' is not a number`, () => {
            const faultyJson = { ...jsonCard1, [field]: "not-a-number" as any };
            expect(() => importCardsFromJson(JSON.stringify([faultyJson])))
                .toThrow(`Invalid card at index 0: '${field}' must be a number.`);
        });
    });

    it('should throw error for invalid due date string', () => {
      const faultyJson = { ...jsonCard1, due: 'invalid-date' };
      expect(() => importCardsFromJson(JSON.stringify([faultyJson])))
        .toThrow("Invalid card at index 0: 'due' must be a valid ISO 8601 date string.");
    });

    it('should throw error for invalid last_review date string', () => {
      const faultyJson = { ...jsonCard1, last_review: 'invalid-date' };
      expect(() => importCardsFromJson(JSON.stringify([faultyJson])))
        .toThrow("Invalid card at index 0: 'last_review' must be a valid ISO 8601 date string or null.");
    });

    it('should throw error for invalid state string', () => {
      const faultyJson = { ...jsonCard1, state: 'InvalidState' as StateType };
      expect(() => importCardsFromJson(JSON.stringify([faultyJson])))
        .toThrow('Invalid card at index 0: \'state\' must be a valid state string (e.g., "New", "Learning", "Review", "Relearning").');
    });

    it('should throw error if elapsed_days is present but not a number', () => {
        const faultyJson = { ...jsonCard1, elapsed_days: "not-a-number" as any };
        expect(() => importCardsFromJson(JSON.stringify([faultyJson])))
            .toThrow("Invalid card at index 0: 'elapsed_days' must be a number if present.");
    });

  });
});
