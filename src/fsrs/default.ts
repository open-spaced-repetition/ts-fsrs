import { Card, DateInput, FSRSParameters, State } from "./models";
import { fixDate } from "./help";

export const default_request_retention = 0.9;
export const default_maximum_interval = 36500;
export const default_w = [
  0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05,
  0.34, 1.26, 0.29, 2.61,
];
export const default_enable_fuzz = false;

export const FSRSVersion: string = "3.3.1";

export const generatorParameters = (
  props?: Partial<FSRSParameters>,
): FSRSParameters => {
  return {
    request_retention: props?.request_retention || default_request_retention,
    maximum_interval: props?.maximum_interval || default_maximum_interval,
    w: props?.w || default_w,
    enable_fuzz: props?.enable_fuzz || default_enable_fuzz,
  };
};

/**
 * Create an empty card
 * @param now Current time
 * @param afterHandler Convert the result to another type. (Optional)
 * @example
 * ```
 * const card: Card = createEmptyCard(new Date());
 * ```
 * @example
 * ```
 * interface CardUnChecked
 *   extends Omit<Card, "due" | "last_review" | "state"> {
 *   cid: string;
 *   due: Date | number;
 *   last_review: Date | null | number;
 *   state: StateType;
 * }
 *
 * function cardAfterHandler(card: Card) {
 *      return {
 *       ...card,
 *       cid: "test001",
 *       state: State[card.state],
 *       last_review: card.last_review ?? null,
 *     } as CardUnChecked;
 * }
 *
 * const card: CardUnChecked = createEmptyCard(new Date(), cardAfterHandler);
 * ```
 */
export function createEmptyCard<R = Card>(
  now?: DateInput,
  afterHandler?: (card: Card) => R,
): R {
  const emptyCard: Card = {
    due: now ? fixDate(now) : new Date(),
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    state: State.New,
    last_review: undefined,
  };
  if (afterHandler && typeof afterHandler === "function") {
    return afterHandler(emptyCard);
  } else {
    return emptyCard as R;
  }
}
