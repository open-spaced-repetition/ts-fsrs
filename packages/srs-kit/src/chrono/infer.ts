import type { SchemaOutputOf } from '../schema/index.js'
import type { AnyChrono } from './chrono.js'

export type ChronoTimeOf<T extends AnyChrono> = SchemaOutputOf<T, 'time'>

export type ChronoCardOf<T extends AnyChrono> = SchemaOutputOf<T, 'card'>

export type ChronoRevlogOf<T extends AnyChrono> = SchemaOutputOf<T, 'revlog'>
