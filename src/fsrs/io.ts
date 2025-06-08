import { Card, State, StateType } from './models';

export type JsonCard = {
  due: string; // ISO 8601 string
  stability: number;
  difficulty: number;
  elapsed_days?: number; // Optional due to deprecation
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: StateType; // String representation of State enum
  last_review?: string | null; // ISO 8601 string or null
};

export function exportCardsToJson(cards: Card[]): string {
  const jsonCards: JsonCard[] = cards.map(card => {
    const jsonCard: JsonCard = {
      due: card.due.toISOString(),
      stability: card.stability,
      difficulty: card.difficulty,
      scheduled_days: card.scheduled_days,
      learning_steps: card.learning_steps,
      reps: card.reps,
      lapses: card.lapses,
      state: State[card.state] as StateType,
      last_review: card.last_review ? card.last_review.toISOString() : null,
    };
    // elapsed_days is deprecated, only include if it has a value (though it's usually 0 by default)
    // However, the type Card has it as non-optional.
    // For export, we can choose to include it or not.
    // Let's include it if it's part of the Card object,
    // as JsonCard makes it optional.
    if (card.elapsed_days !== undefined) {
      jsonCard.elapsed_days = card.elapsed_days;
    }
    return jsonCard;
  });
  return JSON.stringify(jsonCards, null, 2);
}

export function importCardsFromJson(jsonString: string): Card[] {
  const parsedJson = JSON.parse(jsonString);

  if (!Array.isArray(parsedJson)) {
    throw new Error("Invalid JSON: input is not an array.");
  }

  return parsedJson.map((obj: any, index: number) => {
    // Basic validation for required fields and types
    if (typeof obj.due !== 'string' || isNaN(new Date(obj.due).getTime())) {
      throw new Error(`Invalid card at index ${index}: 'due' must be a valid ISO 8601 date string.`);
    }
    if (typeof obj.stability !== 'number') {
      throw new Error(`Invalid card at index ${index}: 'stability' must be a number.`);
    }
    if (typeof obj.difficulty !== 'number') {
      throw new Error(`Invalid card at index ${index}: 'difficulty' must be a number.`);
    }
    if (typeof obj.scheduled_days !== 'number') {
      throw new Error(`Invalid card at index ${index}: 'scheduled_days' must be a number.`);
    }
    if (typeof obj.learning_steps !== 'number') {
      throw new Error(`Invalid card at index ${index}: 'learning_steps' must be a number.`);
    }
    if (typeof obj.reps !== 'number') {
      throw new Error(`Invalid card at index ${index}: 'reps' must be a number.`);
    }
    if (typeof obj.lapses !== 'number') {
      throw new Error(`Invalid card at index ${index}: 'lapses' must be a number.`);
    }
    if (typeof obj.state !== 'string' || !(obj.state in State)) {
      throw new Error(`Invalid card at index ${index}: 'state' must be a valid state string (e.g., "New", "Learning", "Review", "Relearning").`);
    }
    if (obj.last_review !== undefined && obj.last_review !== null && (typeof obj.last_review !== 'string' || isNaN(new Date(obj.last_review).getTime()))) {
      throw new Error(`Invalid card at index ${index}: 'last_review' must be a valid ISO 8601 date string or null.`);
    }
    if (obj.elapsed_days !== undefined && typeof obj.elapsed_days !== 'number') {
        throw new Error(`Invalid card at index ${index}: 'elapsed_days' must be a number if present.`);
    }


    const card: Card = {
      due: new Date(obj.due),
      stability: obj.stability,
      difficulty: obj.difficulty,
      scheduled_days: obj.scheduled_days,
      learning_steps: obj.learning_steps,
      reps: obj.reps,
      lapses: obj.lapses,
      state: State[obj.state as keyof typeof State],
      last_review: obj.last_review ? new Date(obj.last_review) : undefined,
      // Initialize elapsed_days to 0 as it's non-optional in Card,
      // then override if present in JSON.
      elapsed_days: 0,
    };

    if (obj.elapsed_days !== undefined) {
      console.warn(`Warning: Card at index ${index} includes 'elapsed_days' (${obj.elapsed_days}). This field is deprecated and its value will be ignored or reset by FSRS logic in future operations.`);
      card.elapsed_days = obj.elapsed_days;
    }

    return card;
  });
}
