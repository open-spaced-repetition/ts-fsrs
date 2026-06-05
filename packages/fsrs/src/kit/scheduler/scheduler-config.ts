import type { StandardSchemaV1 } from '@standard-schema/spec'
import { FSRSValidationError } from '../../error.js'
import type { IFSRSModel } from '../types.js'
import type { SchedulerConfig } from './scheduler-context.js'
import type { SchedulerMiddleware } from './scheduler-middleware.js'

/**
 * Builds the merged scheduler config via fragment-parse: every contributor is
 * read ONLY through the vendor-neutral `StandardSchemaV1.validate()` interface
 * (never zod-specific `.merge()`), and their validated outputs are shallow
 * merged. zod/mini's `z.object` strips unknown keys, so each source returns just
 * its own slice and the slices compose cleanly.
 *
 * Contributors are the model schema plus every middleware's `configSchema`
 * (including the always-on core middleware that owns request_retention /
 * maximum_interval). Later sources win on key collision.
 */
export function buildSchedulerConfig<
  const Model extends IFSRSModel,
  const Middlewares extends readonly SchedulerMiddleware[] = [],
>(
  model: Model,
  middlewares: Middlewares = [] as unknown as Middlewares,
  options: Record<string, unknown> = {}
): SchedulerConfig<Model, Middlewares> {
  // model.config already supplies validated values (weights, ...).
  const raw = { ...model.config, ...options }
  const sources: StandardSchemaV1[] = [
    model['~configSchema'],
    ...middlewares
      .map((m) => m.configSchema)
      .filter((s): s is StandardSchemaV1 => !!s),
  ]

  const results: StandardSchemaV1.InferOutput<StandardSchemaV1>[] = []
  const issues: StandardSchemaV1.Issue[] = []
  for (const source of sources) {
    const result = source['~standard'].validate(raw)
    if (result instanceof Promise) {
      throw new FSRSValidationError('async config schema is not supported')
    }
    if (result.issues) {
      issues.push(...result.issues)
      continue
    }
    results.push(result.value)
  }

  if (issues.length > 0) {
    throw new FSRSValidationError(
      `invalid scheduler config: ${JSON.stringify(issues)}`
    )
  }

  return Object.assign({}, ...results)
}
