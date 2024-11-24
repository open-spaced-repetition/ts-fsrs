import type { AbstractScheduler } from '../abstract_scheduler'
import type { TSeedStrategy } from './types'

export function DefaultInitSeedStrategy(this: AbstractScheduler): string {
  const time = this.review_time.getTime()
  const reps = this.current.reps
  const mul = this.current.difficulty * this.current.stability
  return `${time}_${reps}_${mul}`
}

/**
 * Generates a seed strategy function for card IDs.
 *
 * @param card_id_field - The field name of the card ID in the current object.
 * @returns A function that generates a seed based on the card ID and repetitions.
 *
 * @remarks
 * The returned function uses the `card_id_field` to retrieve the card ID from the current object.
 * It then adds the number of repetitions (`reps`) to the card ID to generate the seed.
 *
 * @example
 * ```typescript
 * const seedStrategy = GenCardIdSeedStrategy('card_id');
 * const f = fsrs().useStrategy(StrategyMode.SEED, seedStrategy)
 * const card = createEmptyCard<Card & { card_id: number }>()
 * card.card_id = 555
 * const record = f.repeat(card, new Date())
 * ```
 */
export function GenCardIdSeedStrategy(
  card_id_field: string | number
): TSeedStrategy {
  return function (this: AbstractScheduler): string {
    // https://github.com/open-spaced-repetition/ts-fsrs/issues/131#issuecomment-2408426225
    const card_id = Reflect.get(this.current, card_id_field) ?? 0
    const reps = this.current.reps
    // ex1
    // card_id:string + reps:number = 'e2ecb1f7-8d15-420b-bec4-c7212ad2e5dc' + 4
    // = 'e2ecb1f7-8d15-420b-bec4-c7212ad2e5dc4'

    // ex2
    // card_id:number + reps:number = 1732452519198 + 4
    // = '17324525191984'
    return String(card_id + reps || 0)
  }
}
