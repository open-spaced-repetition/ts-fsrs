import type { HasSchema, SchemaInputOf, SchemaOutputOf } from '@/schema/index.js'

export type ModelConfigInputOf<T extends HasSchema<'config'>> = SchemaInputOf<T, 'config'>

export type ModelConfigOf<T extends HasSchema<'config'>> = SchemaOutputOf<T, 'config'>

export type ModelMemoryOf<T extends HasSchema<'memoryState'>> = SchemaOutputOf<T, 'memoryState'>
