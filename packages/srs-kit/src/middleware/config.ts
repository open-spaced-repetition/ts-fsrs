import type {
  EmptyPart,
  IsNonEmptyObject,
  MergeAllObjects,
  MergePart,
  Prettify,
} from '@/schema/index.js'
import type { MiddlewareConfigResolveOf } from './infer.js'
import type { AnyMiddleware } from './middleware.js'

type MiddlewareConfigMap<
  MWs extends readonly AnyMiddleware[],
  Mode extends 'input' | 'output',
> = Prettify<
  MergePart<MergeAllObjects<MiddlewareConfigResolveOf<MWs[number], Mode>>>
>

export type MiddlewareConfigPart<
  MWs extends readonly AnyMiddleware[],
  Mode extends 'input' | 'output',
> =
  IsNonEmptyObject<MiddlewareConfigMap<MWs, Mode>> extends false
    ? EmptyPart
    : MiddlewareConfigMap<MWs, Mode>
