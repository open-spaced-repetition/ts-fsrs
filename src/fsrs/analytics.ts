import { Card, State } from './models';

export function calculateCardDistribution(cards: Card[]): { [key in State]: number } {
  const distribution = {
    [State.New]: 0,
    [State.Learning]: 0,
    [State.Review]: 0,
    [State.Relearning]: 0,
  };

  for (const card of cards) {
    distribution[card.state]++;
  }

  return distribution;
}

export function forecastReviewLoad(
  cards: Card[],
  currentDateOverride?: Date
): { today: number, next7Days: number, next30Days: number } {
  const results = {
    today: 0,
    next7Days: 0,
    next30Days: 0,
  };

  const today = currentDateOverride ? new Date(currentDateOverride) : new Date();
  today.setHours(0, 0, 0, 0); // Start of today

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1); // Start of tomorrow

  const plus7Days = new Date(today);
  plus7Days.setDate(today.getDate() + 7); // Start of the day 7 days from today

  const plus30Days = new Date(today);
  plus30Days.setDate(today.getDate() + 30); // Start of the day 30 days from today

  for (const card of cards) {
    const dueDate = new Date(card.due);
    dueDate.setHours(0,0,0,0); // Normalize due date to the start of its day for comparison

    if (dueDate < tomorrow && dueDate >= today) { // Due is today
      results.today++;
    }
    if (dueDate < plus7Days && dueDate >= today) { // Due within the next 7 days (inclusive of today)
      results.next7Days++;
    }
    if (dueDate < plus30Days && dueDate >= today) { // Due within the next 30 days (inclusive of today)
      results.next30Days++;
    }
  }

  return results;
}

export function identifyProblematicCards(cards: Card[], minLapses: number = 5): Card[] {
  return cards.filter(card => card.lapses >= minLapses);
}

export function calculateMatureCards(
  cards: Card[],
  matureStabilityThreshold: number = 21
): { matureCount: number, youngCount: number, matureCards: Card[], youngCards: Card[] } {
  const result = {
    matureCount: 0,
    youngCount: 0,
    matureCards: [] as Card[],
    youngCards: [] as Card[],
  };

  for (const card of cards) {
    if (card.state === State.Review && card.stability >= matureStabilityThreshold) {
      result.matureCards.push(card);
      result.matureCount++;
    } else {
      result.youngCards.push(card);
      result.youngCount++;
    }
  }
  return result;
}
