import {
  CLAMP_PARAMETERS,
  default_enable_fuzz,
  default_enable_short_term,
  default_learning_steps,
  default_maximum_interval,
  default_relearning_steps,
  default_request_retention,
  default_w,
  FSRS5_DEFAULT_DECAY,
  W17_W18_Ceiling,
} from './constant'
import { TypeConvert } from './convert'
import { FSRSError, FSRSErrorCode } from './error'
import { clamp, roundTo } from './help'
import { type Card, type DateInput, type FSRSParameters, State } from './models'

export const clipParameters = (
  parameters: number[],
  numRelearningSteps: number,
  enableShortTerm: boolean = default_enable_short_term
) => {
  const clip = CLAMP_PARAMETERS(W17_W18_Ceiling, enableShortTerm).slice(
    0,
    parameters.length
  )
  if (Math.max(0, numRelearningSteps) > 1) {
    // PLS = w11 * D ^ -w12 * [(S + 1) ^ w13 - 1] * e ^ (w14 * (1 - R))
    // PLS * e ^ (num_relearning_steps * w17 * w18) should be <= S
    // Given D = 1, R = 0.7, S = 1, PLS is equal to w11 * (2 ^ w13 - 1) * e ^ (w14 * 0.3)
    // So num_relearning_steps * w17 * w18 + ln(w11) + ln(2 ^ w13 - 1) + w14 * 0.3 should be <= ln(1)
    // => num_relearning_steps * w17 * w18 <= - ln(w11) - ln(2 ^ w13 - 1) - w14 * 0.3
    // => w17 * w18 <= -[ln(w11) + ln(2 ^ w13 - 1) + w14 * 0.3] / num_relearning_steps
    // Clamp w11/w13/w14 first so log() never receives <= 0 (otherwise NaN/-Infinity)
    const w11 = clamp(parameters[11] || 0, clip[11][0], clip[11][1])
    const w13 = clamp(parameters[13] || 0, clip[13][0], clip[13][1])
    const w14 = clamp(parameters[14] || 0, clip[14][0], clip[14][1])
    const value =
      -(Math.log(w11) + Math.log(Math.pow(2.0, w13) - 1.0) + w14 * 0.3) /
      numRelearningSteps

    const w17_w18_ceiling = clamp(roundTo(value, 8), 0.01, W17_W18_Ceiling)
    if (clip[17]) clip[17] = [clip[17][0], w17_w18_ceiling]
    if (clip[18]) clip[18] = [clip[18][0], w17_w18_ceiling]
  }
  return clip.map(([min, max], index) =>
    clamp(parameters[index] || 0, min, max)
  )
}

/**
 * @returns The input if the parameters are valid, throws if they are invalid
 * @example
 * try {
 *   generatorParameters({
 *     w: checkParameters([0.40255])
 *   });
 * } catch (e: any) {
 *   alert(e);
 * }
 */
export const checkParameters = (parameters: number[] | readonly number[]) => {
  const invalid = parameters.find(
    (param) => !Number.isFinite(param) && !Number.isNaN(param)
  )
  if (invalid !== undefined) {
    throw new FSRSError(
      FSRSErrorCode.VALIDATION_FAILED,
      `Non-finite or NaN value in parameters ${parameters}`
    )
  } else if (![17, 19, 21].includes(parameters.length)) {
    throw new FSRSError(
      FSRSErrorCode.VALIDATION_FAILED,
      `Invalid parameter length: ${parameters.length}. Must be 17, 19 or 21 for FSRSv4, 5 and 6 respectively.`
    )
  }
  return parameters
}

export const migrateParameters = (
  parameters?: number[] | readonly number[],
  numRelearningSteps: number = 0,
  enableShortTerm: boolean = default_enable_short_term
) => {
  if (parameters === undefined) {
    return [...default_w]
  }
  switch (parameters.length) {
    case 21:
      return clipParameters(
        Array.from(parameters),
        numRelearningSteps,
        enableShortTerm
      )
    case 19:
      console.debug('[FSRS-6]auto fill w from 19 to 21 length')
      return clipParameters(
        Array.from(parameters),
        numRelearningSteps,
        enableShortTerm
      ).concat([0.0, FSRS5_DEFAULT_DECAY])
    case 17: {
      const w = clipParameters(
        Array.from(parameters),
        numRelearningSteps,
        enableShortTerm
      )
      w[4] = +(w[5] * 2.0 + w[4]).toFixed(8)
      w[5] = +(Math.log(w[5] * 3.0 + 1.0) / 3.0).toFixed(8)
      w[6] = +(w[6] + 0.5).toFixed(8)
      console.debug('[FSRS-6]auto fill w from 17 to 21 length')
      return w.concat([0.0, 0.0, 0.0, FSRS5_DEFAULT_DECAY])
    }
    default:
      // To throw use "checkParameters"
      // ref: https://github.com/open-spaced-repetition/ts-fsrs/pull/174#discussion_r2070436201
      console.warn('[FSRS]Invalid parameters length, using default parameters')
      return [...default_w]
  }
}

export const generatorParameters = (
  props?: Partial<FSRSParameters>
): FSRSParameters => {
  const learning_steps = Array.isArray(props?.learning_steps)
    ? props!.learning_steps
    : default_learning_steps
  const relearning_steps = Array.isArray(props?.relearning_steps)
    ? props!.relearning_steps
    : default_relearning_steps
  const enable_short_term =
    props?.enable_short_term ?? default_enable_short_term
  const w = migrateParameters(
    props?.w,
    relearning_steps.length,
    enable_short_term
  )

  return {
    request_retention: props?.request_retention || default_request_retention,
    maximum_interval: props?.maximum_interval || default_maximum_interval,
    w: w,
    enable_fuzz: props?.enable_fuzz ?? default_enable_fuzz,
    enable_short_term: enable_short_term,
    learning_steps: learning_steps,
    relearning_steps: relearning_steps,
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
    learning_steps: 0,
    state: State.New,
    last_review: undefined,
  }
  if (afterHandler && typeof afterHandler === 'function') {
    return afterHandler(emptyCard)
  } else {
    return emptyCard as R
  }
}
