// @ts-nocheck — this file is copied to dist/ at build time, where ./index resolves correctly
import type * as binding from './index'

export interface InitOptimizerOptions {
  /** wasm binary: Buffer/ArrayBuffer, file path, URL, or fetch Response */
  wasm: BufferSource | string | URL | Response
  /** Worker factory function, Worker instance, or path/URL to worker script */
  worker: (() => Worker) | Worker | string | URL
}

/**
 * Dynamically initialize the FSRS optimizer with externally provided wasm and worker resources.
 *
 * Unlike the default entry which loads wasm/worker from hardcoded paths,
 * this function allows you to supply them from any source — useful for
 * bundlers, edge runtimes, or custom build pipelines.
 *
 * @example
 * ```ts
 * import { initOptimizer } from '@open-spaced-repetition/binding/dynamic'
 *
 * const binding = await initOptimizer({
 *   wasm: '/path/to/fsrs-binding.wasm32-wasi.wasm',
 *   worker: '/path/to/wasi-worker.mjs',
 * })
 *
 * // Use FSRSBinding for next states
 * const fsrs = new binding.FSRSBinding()
 * const nextStates = fsrs.nextStates(null, 0.9, 0)
 *
 * // Use computeParameters for training
 * const item = new binding.FSRSBindingItem([
 *   new binding.FSRSBindingReview(3, 0),
 *   new binding.FSRSBindingReview(4, 1),
 * ])
 * const parameters = await binding.computeParameters([item], {
 *   enableShortTerm: true,
 * })
 * ```
 */
export declare function initOptimizer(
  options: InitOptimizerOptions
): Promise<typeof binding>
