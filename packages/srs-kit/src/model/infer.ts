import type { Grade, Rating } from '@/primitives/rating.js'
import type {
  HasSchema,
  IsAny,
  SchemaInputOf,
  SchemaOutputOf,
} from '@/schema/index.js'
import type { AnyModel, Model } from './model.js'

export type ModelConfigInputOf<T extends HasSchema<'config'>> = SchemaInputOf<
  T,
  'config'
>

export type ModelConfigOf<T extends HasSchema<'config'>> = SchemaOutputOf<
  T,
  'config'
>

export type ModelMemoryOf<T extends HasSchema<'memoryState'>> = SchemaOutputOf<
  T,
  'memoryState'
>

/** The `forward` result type; defaults to `readonly ModelMemoryOf<T>[]`. */
export type ModelForwardOf<T extends AnyModel> = ReturnType<
  ReturnType<T['create']>['forward']
>

type ModelEnvValue<
  T extends AnyModel,
  Key extends 'grade' | 'rating',
  Default,
> =
  IsAny<T> extends true
    ? number
    : T extends Model<infer Env>
      ? IsAny<Env> extends true
        ? number
        : Env extends { readonly [K in Key]: infer Value extends number }
          ? Value
          : Default
      : Default

/** Union of all rating values (grades and manual) supported by the model. */
export type ModelRatingOf<T extends AnyModel> = ModelEnvValue<
  T,
  'rating',
  Rating
>

/** Union of all non-manual grade values supported by the model. */
export type ModelGradeOf<T extends AnyModel> = ModelEnvValue<T, 'grade', Grade>
