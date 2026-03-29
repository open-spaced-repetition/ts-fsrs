# @open-spaced-repetition/binding

[![npm version](https://img.shields.io/npm/v/@open-spaced-repetition/binding.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/@open-spaced-repetition/binding)
[![monthly downloads](https://img.shields.io/npm/dm/%40open-spaced-repetition%2Fbinding?style=flat-square)](https://www.npmjs.com/package/@open-spaced-repetition/binding)
[![total downloads](https://img.shields.io/npm/dt/%40open-spaced-repetition%2Fbinding?style=flat-square)](https://www.npmjs.com/package/@open-spaced-repetition/binding)

[Introduction](./README.md) | [简体中文](./README_CN.md) | [はじめに](./README_JA.md)

`@open-spaced-repetition/binding` provides high-performance FSRS tooling powered by `fsrs-rs` and `napi-rs`.

Use it when you need:

- parameter optimization from review history
- CSV-to-FSRS item conversion
- learning and relearning step recommendation
- WASI-based execution in Node.js or custom browser pipelines

> **Public beta notice**: this package is in public testing and its API may change between releases.

## Requirements

- Node.js `>=20`

## Installation

```bash
npm install @open-spaced-repetition/binding
pnpm install @open-spaced-repetition/binding
yarn add @open-spaced-repetition/binding
bun add @open-spaced-repetition/binding
```

## Optimize Parameters

```ts
import { readFileSync } from 'node:fs'
import {
  computeParameters,
  convertCsvToFsrsItems,
} from '@open-spaced-repetition/binding'

const timeZoneFormatterCache = new Map<string, Intl.DateTimeFormat>()

const getTimeZoneFormatter = (timeZone: string) => {
  let formatter = timeZoneFormatterCache.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('ia', {
      timeZone,
      timeZoneName: 'shortOffset',
    })
    timeZoneFormatterCache.set(timeZone, formatter)
  }
  return formatter
}

const getTimezoneOffset = (timeZone: string, date: Date | number) => {
  const timeZoneName = getTimeZoneFormatter(timeZone)
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value

  if (!timeZoneName || timeZoneName === 'GMT' || timeZoneName === 'UTC') {
    return 0
  }

  const [, sign, hours, minutes = '0'] =
    timeZoneName.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/) ?? []

  if (!sign || !hours) {
    throw new Error(`Unsupported time zone offset: ${timeZoneName}`)
  }

  const totalMinutes = Number(hours) * 60 + Number(minutes)
  return sign === '+' ? totalMinutes : -totalMinutes
}

// Creating Intl.DateTimeFormat repeatedly can be slow, so prefer hoisting or caching formatters.

const csvBuffer = readFileSync('./revlog.csv')
const items = convertCsvToFsrsItems(
  csvBuffer,
  4,
  'Asia/Shanghai',
  (ms, timeZone) => getTimezoneOffset(timeZone, ms)
)

const parameters = await computeParameters(items, {
  enableShortTerm: true,
  numRelearningSteps: 1,
  timeout: 500,
  progress: (current, total) => {
    console.log(`${current}/${total}`)
  },
})

console.log(parameters)
```

## Recommend Learning Steps

```ts
import { readFileSync } from 'node:fs'
import { computeOptimalSteps } from '@open-spaced-repetition/binding'

const csvBuffer = readFileSync('./revlog.csv')
const stepStats = computeOptimalSteps(csvBuffer, 0.9, 0.5)

console.log(stepStats.recommendedLearningSteps)
console.log(stepStats.recommendedRelearningSteps)
```

The third argument can be either:

- a decay value between `0.1` and `0.8`
- a full FSRS parameter array

Due to technical limitations, at most two learning steps and one relearning step can be recommended. This does not mean you need that many steps, and it does not mean they are always sufficient. It is also possible that no steps are recommended when the data is not suitable.

If you are already using more steps with FSRS, be careful when changing the number of steps. Reducing the number of steps can significantly lower retention, and FSRS may need a long time to adapt to the new step configuration.

## Dynamic WASI Initialization

Before using this setup, install the WASI asset package manually:

```bash
pnpm add @open-spaced-repetition/binding-wasm32-wasi
```

In Vite, you can load the WASM asset with `?url` and the worker with `?worker`, then initialize the optimizer through the dynamic entry:

```ts
import { initOptimizer } from '@open-spaced-repetition/binding/dynamic-wasi'
import wasmUrl from '@open-spaced-repetition/binding-wasm32-wasi/fsrs-binding.wasm32-wasi.wasm?url'
import WasiWorker from '@open-spaced-repetition/binding-wasm32-wasi/wasi-worker-browser.mjs?worker'

const binding = await initOptimizer({
  wasm: wasmUrl,
  worker: () => new WasiWorker(),
})

const item = new binding.FSRSBindingItem([
  new binding.FSRSBindingReview(3, 0),
  new binding.FSRSBindingReview(4, 1),
])

const parameters = await binding.computeParameters([item], {
  enableShortTerm: true,
  numRelearningSteps: 1,
})

console.log(parameters)
```

For browser deployments, enable cross-origin isolation to avoid worker and WASM loading issues. In practice, serve the page with both of these headers:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Example plugin using dynamic WASI for in-browser training:

- [FSRS Parameter Optimizer (Chrome Web Store)](https://chromewebstore.google.com/detail/fsrs-parameter-optimizer/hkbooedgcdmlhjgbljkgmdmfggklkmji)

## WASI Without Dynamic Loading

If you do not need dynamic WASI loading, you can let pnpm install the WASI package automatically by enabling `wasm32` in `supportedArchitectures`:

```json
{
  "pnpm": {
    "supportedArchitectures": {
      "cpu": ["current", "wasm32"]
    }
  }
}
```

When using this approach, make sure your framework does not prebundle or tree-shake `@open-spaced-repetition/binding` in a way that drops the WASM asset.

For example:

- In Next.js, add `@open-spaced-repetition/binding` to `serverExternalPackages`
- In Vite, add `@open-spaced-repetition/binding` to `optimizeDeps.exclude`

```ts
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  optimizeDeps: {
    exclude: ['@open-spaced-repetition/binding'],
  },
})
```

## Notes

- **Edge runtimes are not supported by the default WASI path.**
- For browser usage, prefer bundling the generated WASM and worker assets explicitly.
- In browsers, set `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` so worker and WASM resources can load without cross-origin isolation issues.
- The Vite example above requires `@open-spaced-repetition/binding-wasm32-wasi` to be installed explicitly.
- If you rely on pnpm `supportedArchitectures` instead of dynamic loading, exclude `@open-spaced-repetition/binding` from framework optimization when needed so the WASM asset is not dropped.
- For scheduler-only workloads, use [`ts-fsrs`](https://www.npmjs.com/package/ts-fsrs).

## Examples

- Training script: [packages/binding-test/src/examples/simple.ts](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/binding-test/src/examples/simple.ts)
- Next.js training example: [examples/nextjs](https://github.com/open-spaced-repetition/ts-fsrs/tree/main/examples/nextjs)

## Documentation

- Repository overview: [github.com/open-spaced-repetition/ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs#readme)
- Full scheduler package README: [ts-fsrs](https://www.npmjs.com/package/ts-fsrs)
- Contribution guide: [CONTRIBUTING.md](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/CONTRIBUTING.md)
- Simplified Chinese README: [README_CN.md](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/binding/README_CN.md)
- Japanese README: [README_JA.md](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/binding/README_JA.md)
