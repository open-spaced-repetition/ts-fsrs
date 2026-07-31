#!/usr/bin/env bash
set -euo pipefail

# The threadless flavor must not link against the wasi-sdk toolchain,
# otherwise pthread imports leak into the wasm module.
unset WASI_SDK_PATH

# Run via `pnpm build:wasm*`, which puts the pinned @napi-rs/cli on PATH
cd "$(dirname "$0")"
napi build --platform --release --esm --dts index.d.cts --target wasm32-wasip1 -o ./dist
cp \
  ./dist/fsrs-binding.wasm32-wasip1.wasm \
  ./dist/fsrs-binding.wasip1.cjs \
  ./dist/fsrs-binding.wasip1.d.cts \
  ./dist/fsrs-binding.wasip1-browser.js \
  ./dist/fsrs-binding.wasip1-deferred.js \
  ./dist/fsrs-binding.wasip1-deferred.d.ts \
  ./npm/wasm32-wasip1/
