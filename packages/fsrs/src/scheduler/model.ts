import { z } from 'zod/mini'
import type { IFSRSModel } from '../kit/types.js'
import type {
  SchemaInput,
  SchemaOutput,
  StandardSchemaV1Contract,
} from './standard-schema.js'

export const FSRSMemoryStateSchema = z.object({
  difficulty: z.number(),
  stability: z.number(),
})

export type FSRSMemoryState = z.infer<typeof FSRSMemoryStateSchema>

export interface SchedulerModelDefinition<
  ConfigSchema extends StandardSchemaV1Contract = StandardSchemaV1Contract,
  MemoryStateSchema extends StandardSchemaV1Contract<
    FSRSMemoryState,
    FSRSMemoryState
  > = StandardSchemaV1Contract<FSRSMemoryState, FSRSMemoryState>,
> {
  readonly configSchema: ConfigSchema
  readonly memoryStateSchema: MemoryStateSchema
  create(
    config: SchemaInput<ConfigSchema>
  ): IFSRSModel<SchemaOutput<ConfigSchema>, SchemaOutput<MemoryStateSchema>>
}
