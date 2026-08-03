#!/usr/bin/env bash
set -euo pipefail

# WASI SDK, required by the threaded target:
# https://github.com/WebAssembly/wasi-sdk/releases
# tar -xvf wasi-sdk-27.0-arm64-macos.tar.gz -C $HOME
# mv $HOME/wasi-sdk-27.0-arm64-macos $HOME/.wasi-sdk
# export WASI_SDK_PATH="$HOME/.wasi-sdk"
: "${WASI_SDK_PATH:?WASI_SDK_PATH is required for the threaded WASI build}"

# Run via `pnpm build:wasm*`, which puts the pinned @napi-rs/cli on PATH
cd "$(dirname "$0")"
napi build --platform --release --esm --dts index.d.cts --target wasm32-wasip1-threads -o ./dist
