import {
  default_enable_fuzz,
  default_enable_short_term,
  default_learning_steps,
  default_maximum_interval,
  default_relearning_steps,
  default_request_retention,
} from './constant'
import { TypeConvert } from './convert'
import { FSRSValidationError } from './error'
import { type Card, type DateInput, type FSRSParameters, State } from './models'
import { migrateFSRS6Parameters } from './models/fsrs-6/parameters.js'

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
  const invalid = parameters.find((param) => !Number.isFinite(param))
  if (invalid !== undefined) {
    throw new FSRSValidationError(
      `Non-finite or NaN value in parameters ${parameters}`
    )
  } else if (![17, 19, 21].includes(parameters.length)) {
    throw new FSRSValidationError(
      `Invalid parameter length: ${parameters.length}. Must be 17, 19 or 21 for FSRSv4, 5 and 6 respectively.`
    )
  }
  return parameters
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
  const w = migrateFSRS6Parameters(
    props?.w ? Array.from(props.w) : undefined,
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
 * @example
 * ```typescript
 * const card: Card = createEmptyCard(new Date());
 * ```
 */
export function createEmptyCard(now?: DateInput): Card {
  const emptyCard: Card = {
    due: now ? TypeConvert.time(now) : new Date(),
    stability: 0,
    difficulty: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    learning_steps: 0,
    state: State.New,
    last_review: undefined,
  }
  return emptyCard
}
