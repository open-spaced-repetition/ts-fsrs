# @open-spaced-repetition/fsrs-wasip1

ESM-only FSRS-6 and FSRS-7 models for the `ts-fsrs` / SRS Kit framework, backed by the threadless WASI Preview 1 binding. Requires `ts-fsrs >=6.0.0` as a peer dependency. No TypeScript model is instantiated and no calculation falls back to TypeScript.

```ts
import { FSRS7Model } from '@open-spaced-repetition/fsrs-wasip1'
import { FSRS7_DEFAULT_WEIGHTS } from 'ts-fsrs/models/fsrs-7'

const model = FSRS7Model.create({
  config: { weights: FSRS7_DEFAULT_WEIGHTS },
})
const states = model.forward({
  history: [
    { deltaT: 0, rating: 3 },
    { deltaT: 2.5, rating: 4 },
  ],
})
// Float64Array of [stability, difficulty, stabilityFast] triples.
const secondStability = states[3]
```

`step`, `forward`, `forgettingCurve`, and `nextInterval` execute in WASM. `step` and `initialState` use ordinary state objects, including `stabilityFast` for FSRS-7. `forward` returns the binding's `Float64Array` directly, without building state objects; its stride is 3 for both versions (the third value is redundant for FSRS-6). They can be passed to `defineScheduler({ model: FSRS7Model, chrono: dateChrono })` from `ts-fsrs`. `forward` contains every post-review state, excludes `initialState`, and accepts an initial state for truncated histories.

SRS Kit retains the existing object-array result for TS models and infers the packed result for these WASM models. `Reschedule.replay()` preserves the original packed `memoryStates` buffer; its `memoryState` is a `Float64Array` view of the final triple, sharing that buffer. No decoder or full-history conversion is involved. For custom packed models, rows must have a fixed width with one row per review.

## High-throughput revlog replay

Use one batch for many cards with the same weights. Calling a WASM function once per review or per short card history spends most of its time crossing the JS/WASM boundary.

```ts
// Pairs: [elapsed days, rating]. Cards are independent and start as new.
const reviews = new Float64Array([0, 3, 2, 4, 0, 1, 0.01, 3])
// Card boundaries in review indices, including start and end.
const offsets = new Uint32Array([0, 2, 4])
const states = model.algorithm.forwardBatch(reviews, offsets)
// Triples: [stability, difficulty, stabilityFast], in the input review order.

const withCurve = model.algorithm.forwardBatch(reviews, offsets, true)
// Quadruples: [stability, difficulty, stabilityFast, preReviewRetrievability].
// The first review of each card has preReviewRetrievability = 0.
```

For Anki-style statistics, group by parameter configuration and card, split at forget/reset events, exclude manual/cram events as the caller already does, and retain the mapping back to original revlog indices. All intermediate states are returned so daily statistics can still be assembled in chronological order. Pass `true` as the third argument to include pre-review retrievability without a second JS/WASM call per review. Batch replay starts each segment as new; use `forward(history, initialState)` on the binding or `model.forward({ history, initialState })` for a resumed segment.

The hot path assumes valid finite states, nonnegative elapsed days, and ratings 1–4. Only packed-buffer framing is checked; validate external data during ingestion. The optional `step.retrievability` hint is ignored because fsrs-rs computes its curve internally; custom retrievability overrides are not supported. FSRS-6 requires `enableShortTerm: true`.

These models follow **fsrs-rs semantics**: f32 arithmetic, FSRS-6 elapsed-day rounding and stability floor `0.0001` (TS uses `0.001`), and upstream interval bounds. They are not bit-for-bit replacements for TS models. Configuration schema/parameter helpers come from `ts-fsrs`, and the Rust constructor also normalizes parameters; bypass/clip flags do not disable upstream normalization. Model weights are captured at construction; create a new model to change them.

The binding chooses its Node or browser entry through package export conditions. Browser consumers must support top-level await and emit the binding's `.wasm` asset. This package does not add workers, shared memory, or a native-addon fallback.

## Development and measurement

From the repository root:

```sh
pnpm exec turbo run build test typecheck --filter=@open-spaced-repetition/fsrs-wasip1
node docs/scripts/fetch-revlog.mjs
pnpm exec turbo run bench --filter=@open-spaced-repetition/fsrs-wasip1
```

Turbo builds the Rust WASIP1 artifact and prepares its workspace package before compiling the model. The platform artifact package has no build script. The benchmark is TypeScript and runs directly on Node 24+; it compares synthetic histories and the pinned public revlog fixture. See [BENCHMARK.md](./BENCHMARK.md) for measured results and limits.
