import type {
  EmptyPart,
  SchemaInputOf,
  SchemaOf,
  SchemaOutputOf,
} from '../schema/index.js'
import type { AnyChrono } from './chrono.js'

export type ChronoTimeOf<T extends AnyChrono> = SchemaOutputOf<T, 'time'>

export type ChronoCardOf<T extends AnyChrono> = SchemaOutputOf<T, 'card'>

export type ChronoRevlogOf<T extends AnyChrono> = SchemaOutputOf<T, 'revlog'>

export type ChronoConfigPart<
  T extends AnyChrono,
  Mode extends 'input' | 'output',
> = [SchemaOf<T, 'config'>] extends [never]
  ? EmptyPart
  : Mode extends 'input'
    ? { readonly chrono: SchemaInputOf<T, 'config'> }
    : { readonly chrono: SchemaOutputOf<T, 'config'> }
