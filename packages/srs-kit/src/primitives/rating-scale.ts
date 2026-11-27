import { Rating } from './rating.js'

export type RatingScaleEntry = {
  readonly value: number
  /** A failed recall. Lapse grades must sort below every other grade. */
  readonly lapse?: boolean
  /** A manual rating, which is not a grade. Cannot also be a lapse. */
  readonly manual?: boolean
}

export type RatingScale = Readonly<Record<string, RatingScaleEntry>>

type RatingScaleEntries<Scale extends RatingScale> = Scale extends RatingScale
  ? Scale[keyof Scale]
  : never

export type RatingScaleRatingOf<Scale extends RatingScale> =
  RatingScaleEntries<Scale>['value']

/** Values of entries that may be grades (not `manual: true`). */
export type RatingScaleGradeOf<Scale extends RatingScale> = Exclude<
  RatingScaleEntries<Scale>,
  { readonly manual: true }
>['value']

/** Values guaranteed to be grades regardless of a runtime manual flag. */
export type RatingScaleCertainGradeOf<Scale extends RatingScale> = Extract<
  RatingScaleEntries<Scale>,
  { readonly value: number; readonly manual?: false | undefined }
>['value']

export const defaultRatingScale = Object.freeze({
  Manual: Object.freeze({ value: Rating.Manual, manual: true }),
  Again: Object.freeze({ value: Rating.Again, lapse: true }),
  Hard: Object.freeze({ value: Rating.Hard }),
  Good: Object.freeze({ value: Rating.Good }),
  Easy: Object.freeze({ value: Rating.Easy }),
}) satisfies RatingScale
