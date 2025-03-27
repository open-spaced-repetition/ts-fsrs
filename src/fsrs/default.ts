import { Card, DateInput, FSRSParameters, State } from './models'
import { TypeConvert } from './convert'
import { version } from '../../package.json'
import { clamp } from './help'

export const default_request_retention = 0.9
export const default_maximum_interval = 36500
export const default_w = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575,
  0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655,
  0.6621,
]
export const default_enable_fuzz = false
export const default_enable_short_term = true

export const FSRSVersion: string = `v${version} using FSRS-5.0`

export const S_MIN = 0.01
export const INIT_S_MAX = 100.0
export const CLAMP_PARAMETERS: Array<[number /**min */, number /**max */]> = [
  [S_MIN, INIT_S_MAX] /** initial stability (Again) */,
  [S_MIN, INIT_S_MAX] /** initial stability (Hard) */,
  [S_MIN, INIT_S_MAX] /** initial stability (Good) */,
  [S_MIN, INIT_S_MAX] /** initial stability (Easy) */,
  [1.0, 10.0] /** initial difficulty (Good) */,
  [0.001, 4.0] /** initial difficulty (multiplier) */,
  [0.001, 4.0] /** difficulty (multiplier) */,
  [0.001, 0.75] /** difficulty (multiplier) */,
  [0.0, 4.5] /** stability (exponent) */,
  [0.0, 0.8] /** stability (negative power) */,
  [0.001, 3.5] /** stability (exponent) */,
  [0.001, 5.0] /** fail stability (multiplier) */,
  [0.001, 0.25] /** fail stability (negative power) */,
  [0.001, 0.9] /** fail stability (power) */,
  [0.0, 4.0] /** fail stability (exponent) */,
  [0.0, 1.0] /** stability (multiplier for Hard) */,
  [1.0, 6.0] /** stability (multiplier for Easy) */,
  [0.0, 2.0] /** short-term stability (exponent) */,
  [0.0, 2.0] /** short-term stability (exponent) */,
]

export const generatorParameters = (
  props?: Partial<FSRSParameters>
): FSRSParameters => {
  let w = default_w
  if (props?.w) {
    if (props.w.length === 19) {
      w = props?.w
    } else if (props.w.length === 17) {
      w = props?.w.concat([0.0, 0.0])
      w[4] = +(w[5] * 2.0 + w[4]).toFixed(8)
      w[5] = +(Math.log(w[5] * 3.0 + 1.0) / 3.0).toFixed(8)
      w[6] = +(w[6] + 0.5).toFixed(8)
      console.debug('[FSRS V5]auto fill w to 19 length')
    }
  }
  w = w.map((w, index) =>
    clamp(w, CLAMP_PARAMETERS[index][0], CLAMP_PARAMETERS[index][1])
  )
  return {
    request_retention: props?.request_retention || default_request_retention,
    maximum_interval: props?.maximum_interval || default_maximum_interval,
    w: w,
    enable_fuzz: props?.enable_fuzz ?? default_enable_fuzz,
    enable_short_term: props?.enable_short_term ?? default_enable_short_term,
  } satisfies FSRSParameters
}

/**
 * Create an empty card
 * @param now Current time
 * @param afterHandler Convert the result to another type. (Optional)
 * @example
 * ```typescript
 * const card: Card = createEmptyCard(new Date());
 * ```
 * @example
 * ```typescript
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
