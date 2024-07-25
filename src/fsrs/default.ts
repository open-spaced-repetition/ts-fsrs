import { Card, DateInput, FSRSParameters, State } from './models'
import { TypeConvert } from './convert'

export const default_request_retention = 0.9
export const default_maximum_interval = 36500
export const default_w = [
  0.4197, 1.1869, 3.0412, 15.2441, 7.1434, 0.6477, 1.0007, 0.0674, 1.6597,
  0.1712, 1.1178, 2.0225, 0.0904, 0.3025, 2.1214, 0.2498, 2.9466, 0.4891,
  0.6468,
]
export const default_enable_fuzz = false
export const defualt_enable_short_term = true

export const FSRSVersion: string = 'v4.0.0 using FSRS V5.0'

export const generatorParameters = (
  props?: Partial<FSRSParameters>
): FSRSParameters => {
  let w = default_w
  if (props?.w) {
    if (props.w.length === 19) {
      w = props?.w
    } else if (props.w.length === 17) {
      w = props?.w.concat([0.0, 0.0])
      console.debug('[FSRS V5]auto fill w to 19 length')
    }
  }
  return {
    request_retention: props?.request_retention || default_request_retention,
    maximum_interval: props?.maximum_interval || default_maximum_interval,
    w: w,
    enable_fuzz: props?.enable_fuzz ?? default_enable_fuzz,
    enable_short_term:
      props?.enable_short_term ?? defualt_enable_short_term,
  } satisfies FSRSParameters
}

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
  afterHandler?: (card: Card) => R
): R {
  const emptyCard: Card = {
    due: now ? TypeConvert.time(now) : new Date(),
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    state: State.New,
    last_review: undefined,
  }
  if (afterHandler && typeof afterHandler === 'function') {
    return afterHandler(emptyCard)
  } else {
    return emptyCard as R
  }
}
