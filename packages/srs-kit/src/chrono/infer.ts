import type { SchemaInputOf, SchemaOutputOf } from '../schema/index.js'
import type { AnyChrono } from './chrono.js'

export type ChronoTimeOf<T extends AnyChrono> = SchemaInputOf<T, 'time'>

export type ChronoCardOf<T extends AnyChrono> = SchemaOutputOf<T, 'card'>

export type ChronoRevlogOf<T extends AnyChrono> = SchemaOutputOf<T, 'revlog'>
