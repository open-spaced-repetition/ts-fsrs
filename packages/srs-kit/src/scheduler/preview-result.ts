import type { LazyIterable } from '@/schema/index.js'
import type { PreviewItem } from './fields.js'

/**
 * Preview of a scheduler whose grades are not the default `Grade`. It shares
 * the `PreviewResult` name so hovers read `PreviewResult<{ … }, 0 | 1 | …>`;
 * the default-grade variant in `fields.ts` keeps `PreviewResult<{ … }>`.
 */
export interface PreviewResult<
  Env extends { card: object; revlog: object },
  G extends number,
> extends LazyIterable<PreviewItem<Env['card'], Env['revlog'], G>> {}
