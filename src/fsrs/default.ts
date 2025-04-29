import { Card, DateInput, FSRSParameters, State } from './models'
import { TypeConvert } from './convert'
import { clamp } from './help'
import {
  CLAMP_PARAMETERS,
  default_enable_fuzz,
  default_enable_short_term,
  default_maximum_interval,
  default_request_retention,
  default_w,
  FSRS5_DEFAULT_DECAY,
  W17_W18_Ceiling,
} from './constant'

export const clipParameters = (
  parameters: number[],
  numRelearningSteps: number
) => {
  let w17_w18_ceiling = W17_W18_Ceiling
  if (Math.max(0, numRelearningSteps) > 1) {
    // PLS = w11 * D ^ -w12 * [(S + 1) ^ w13 - 1] * e ^ (w14 * (1 - R))
    // PLS * e ^ (num_relearning_steps * w17 * w18) should be <= S
    // Given D = 1, R = 0.7, S = 1, PLS is equal to w11 * (2 ^ w13 - 1) * e ^ (w14 * 0.3)
    // So num_relearning_steps * w17 * w18 + ln(w11) + ln(2 ^ w13 - 1) + w14 * 0.3 should be <= ln(1)
    // => num_relearning_steps * w17 * w18 <= - ln(w11) - ln(2 ^ w13 - 1) - w14 * 0.3
    // => w17 * w18 <= -[ln(w11) + ln(2 ^ w13 - 1) + w14 * 0.3] / num_relearning_steps
    const value =
      -(
        Math.log(parameters[11]) +
        Math.log(Math.pow(2.0, parameters[13]) - 1.0) +
        parameters[14] * 0.3
      ) / numRelearningSteps

    w17_w18_ceiling = clamp(+value.toFixed(8), 0.01, 2.0)
  }
  const clip = CLAMP_PARAMETERS(w17_w18_ceiling)
  return clip.map(([min, max], index) => clamp(parameters[index], min, max))
}

export const migrateParameters = (
  parameters?: number[] | readonly number[]
) => {
  if (parameters === undefined) {
    return [...default_w]
  }
  switch (parameters.length) {
    case 21:
      return [...parameters]
    case 19:
      console.debug('[FSRS-6]auto fill w from 19 to 21 length')
      return [...parameters, 0.0, FSRS5_DEFAULT_DECAY]
    case 17: {
      const w = [...parameters]
      w[4] = +(w[5] * 2.0 + w[4]).toFixed(8)
      w[5] = +(Math.log(w[5] * 3.0 + 1.0) / 3.0).toFixed(8)
      w[6] = +(w[6] + 0.5).toFixed(8)
      console.debug('[FSRS-6]auto fill w from 17 to 21 length')
      return w.concat([0.0, 0.0, 0.0, FSRS5_DEFAULT_DECAY])
    }
    default:
      console.warn('[FSRS]Invalid parameters length, using default parameters')
      return [...default_w]
  }
}

export const generatorParameters = (
  props?: Partial<FSRSParameters>
): FSRSParameters => {
  const w = clipParameters(migrateParameters(props?.w), 0/** @TODO */)
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
