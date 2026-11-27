import type {
  HasSchema,
  SchemaInputOf,
  SchemaOutputOf,
} from '@/schema/index.js'
import type { AnyModel } from './model.js'

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
