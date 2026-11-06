# WASIP1 replay benchmark — 2026-11-06

Batching is necessary. Replacing each TS `step`/curve call with a WASM call makes this workload much slower. A single cross-card batch, returning packed states and pre-review retrievability, gives a modest improvement in the tested replay kernel. It does not establish an end-to-end Anki speedup.

## Environment and workload

- Apple M2, darwin/arm64, Node v26.13.0; real `wasm32-wasip1`, release build.
- fsrs-rs commit `f0fbb3c0b9e3a2933aa466c4ab41911579055219`; TS models from this workspace.
- Two warmups, seven timed samples, rotated execution order. Tables show medians in milliseconds. Yield and explicit GC occur outside each timed sample. WASM startup/compilation and model creation are excluded.
- Synthetic: 2,000 distinct card histories × 30 reviews (60,000 reviews).
- Public revlog: 9,793 cards, 123,730 reviews; SHA-256 `80b260e7e140755123179a5f1be931b586c031e9c594e2054c3bc267e8f1f369`.
- CSV parsing, sorting, grouping and UTC-day delta calculation happen before timing. Both models receive identical prepared histories. This is not Anki timezone/rollover conversion.
- WASM batch measurements include packing the full dataset and directly consuming the returned Float64Array. No state objects are reconstructed. The prepacked case reuses prepared input buffers; TS retains its object-array API. Per-card model.forward also returns its raw Float64Array. Reschedule.replay preserves that buffer and exposes the final row as a subarray view.
- All per-review states are compared with TS before timing; numerical differences are reported, not assumed absent. Outputs are consumed by checksums.

## Public revlog: state plus pre-review retrievability

| Model  | TS step + curve | WASM step + curve | WASM batch + curve, including packing | TS / batch |
| ------ | --------------: | ----------------: | ------------------------------------: | ---------: |
| FSRS-6 |          16.558 |           870.526 |                                12.610 |      1.31× |
| FSRS-7 |          55.847 |           974.497 |                                38.216 |      1.46× |

## Public revlog: states only

| Model  | TS forward | WASM forward per card, packed | WASM cross-card batch, including packing | WASM prepacked batch |
| ------ | ---------: | ----------------------------: | ---------------------------------------: | -------------------: |
| FSRS-6 |     11.483 |                       113.533 |                                    9.956 |                9.499 |
| FSRS-7 |     39.209 |                       131.845 |                                   28.718 |               28.207 |

Direct packed consumption avoids the previous object reconstruction. Including input packing, states-only batching is about 1.15× faster for FSRS-6 and 1.37× for FSRS-7 in this run. Per-card calls are still substantially slower than TS, so eliminating conversion alone does not eliminate crossing overhead.

## Synthetic histories

| Model  | TS step + curve | WASM batch + curve | TS forward | WASM batch |
| ------ | --------------: | -----------------: | ---------: | ---------: |
| FSRS-6 |          11.189 |              6.138 |      5.581 |      4.694 |
| FSRS-7 |          29.861 |             18.585 |     19.283 |     13.691 |

## Numerical differences

- FSRS-6 is not equivalent to the current TS model on failure-heavy histories. fsrs-rs clamps stability to `0.0001`; TS clamps to `0.001`. Example: from S=`0.0010230820626020432`, D=`9.977883338928223`, same-day Again produces WASM S≈`0.00057139446` but TS S=`0.001`. Subsequent reviews amplify this difference. The real fixture contains 234 compared fields above scaled error `1e-4`; the worst later stability is TS `1.03937354` versus WASM `0.4670376778`. This is a semantic difference, not just f32 rounding.
- FSRS-7 uses f32 in Rust versus TS number arithmetic and rounding. The maximum observed scaled state error is `0.000349527` on the real fixture (10 fields above `1e-4`); synthetic maximum is below `4e-6`.
- Scaled error is `abs(wasm - ts) / max(1, abs(ts))`, measured across all state fields and all review prefixes. These timings must not be read as proof of exact TS compatibility.

## Implication for Anki-Search-Stats-Extended

The inspected `src/ts/MemorisedBar.ts` uses FSRS-6, maintains per-card states, calls `forgettingCurve` for review probabilities, then `step`. It also performs date handling, daily quantiles/means, leech probability updates, graph aggregation, reset/cram filtering and rendering outside the model. Those operations are not timed here.

Keep TS for the current per-review integration. To use WASM, preprocess histories by parameter configuration/card/reset segment, call `model.algorithm.forwardBatch(reviews, offsets, true)`, then map returned states and pre-review probabilities back to chronological revlogs. Retain the existing reset, cram, timezone and incomplete-history handling. A per-card `forward` call alone is still slower than TS in this workload.

The FSRS-6 kernel improvement is about 1.31× here and comes with different stability-floor semantics, so this does not justify a transparent replacement of the current add-on model. FSRS-7 provides about 1.46× for state-plus-curve replay. Browser/Anki startup, daily curve sampling, full graph generation and UI responsiveness have not been benchmarked.

## Reproduce

```sh
node docs/scripts/fetch-revlog.mjs
pnpm exec turbo run bench --filter=@open-spaced-repetition/fsrs-wasip1
```

Source: [bench/revlog.ts](./bench/revlog.ts). Raw medians, ranges and numerical diagnostics: [bench/results.json](./bench/results.json).
