import type { AnyObjectSchema, AnySchema } from '../schema/index.js'
import type { ModelCreate, ModelDefinition } from './types.js'

export function defineModel<
  const ConfigSchema extends AnySchema,
  const MemoryStateSchema extends AnyObjectSchema,
  const Create extends ModelCreate<ConfigSchema, MemoryStateSchema>,
>(
  definition: ModelDefinition<ConfigSchema, MemoryStateSchema, Create>
): ModelDefinition<ConfigSchema, MemoryStateSchema, Create> {
  return definition
}
