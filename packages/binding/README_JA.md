# @open-spaced-repetition/binding

[Introduction](./README.md) | [简体中文](./README_CN.md) | [はじめに](./README_JA.md)

[![npm version](https://img.shields.io/npm/v/@open-spaced-repetition/binding.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/@open-spaced-repetition/binding)
[![monthly downloads](https://img.shields.io/npm/dm/%40open-spaced-repetition%2Fbinding?style=flat-square)](https://www.npmjs.com/package/@open-spaced-repetition/binding)
[![total downloads](https://img.shields.io/npm/dt/%40open-spaced-repetition%2Fbinding?style=flat-square)](https://www.npmjs.com/package/@open-spaced-repetition/binding)

`@open-spaced-repetition/binding` は、`fsrs-rs` と `napi-rs` をベースにした高性能な FSRS ツールキットです。

主な用途：

- レビュー履歴からのパラメータ最適化
- CSV から FSRS 学習データへの変換
- 学習ステップと再学習ステップの推奨
- Node.js や独自のブラウザパイプラインでの WASI 実行

> **公開ベータ注意**：このパッケージは現在公開テスト中であり、API は将来変更される可能性があります。

## 要件

- Node.js `>=20`

## インストール

```bash
npm install @open-spaced-repetition/binding
pnpm install @open-spaced-repetition/binding
yarn add @open-spaced-repetition/binding
bun add @open-spaced-repetition/binding
```

## パラメータ最適化

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

// Intl.DateTimeFormat を毎回 new すると遅くなりやすいため、formatter は外に出すかキャッシュすることを推奨します。

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

## 学習ステップの推奨

```ts
import { readFileSync } from 'node:fs'
import { computeOptimalSteps } from '@open-spaced-repetition/binding'

const csvBuffer = readFileSync('./revlog.csv')
const stepStats = computeOptimalSteps(csvBuffer, 0.9, 0.5)

console.log(stepStats.recommendedLearningSteps)
console.log(stepStats.recommendedRelearningSteps)
```

3 番目の引数には次のいずれかを指定できます。

- `0.1` から `0.8` の decay 値
- 完全な FSRS パラメータ配列

技術的な制約により、推奨できるのは最大で初学ステップ 2 つと再学習ステップ 1 つまでです。これはその数のステップが必須という意味でも、常に十分という意味でもありません。データ量が不足している場合や、データが推奨に適さない場合は、ステップが推奨されないこともあります。

すでに FSRS でより多くのステップを使っている場合は、ステップ数を変更する際に注意してください。ステップ数を減らすと保持率が大きく下がる可能性があり、FSRS が新しいステップ構成に適応するまで長い時間がかかることがあります。

## WASI の動的初期化

この構成を使う前に、WASI アセット用パッケージを手動でインストールする必要があります:

```bash
pnpm add @open-spaced-repetition/binding-wasm32-wasi
```

Vite では、WASM を `?url`、worker を `?worker` で読み込み、動的エントリ経由でオプティマイザーを初期化できます。

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

ブラウザでこの構成をデプロイする場合は、worker と WASM の読み込み時に cross-origin isolation の問題を避けるため、cross-origin isolation を有効にすることを推奨します。通常はレスポンスヘッダーに次の 2 つを設定します。

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

ブラウザ内トレーニングで dynamic WASI を使っている実例プラグイン:

- [FSRS Parameter Optimizer (Chrome Web Store)](https://chromewebstore.google.com/detail/fsrs-parameter-optimizer/hkbooedgcdmlhjgbljkgmdmfggklkmji)

## 動的ロードを使わない WASI

dynamic WASI ロードが不要な場合は、pnpm の `supportedArchitectures` で `wasm32` を有効にすることで、対応する WASI パッケージを自動的にインストールできます。

```json
{
  "pnpm": {
    "supportedArchitectures": {
      "cpu": ["current", "wasm32"]
    }
  }
}
```

この方法では、フレームワークの事前バンドルや tree-shaking によって `@open-spaced-repetition/binding` と WASM アセットが落とされないように注意してください。

たとえば:

- Next.js では `@open-spaced-repetition/binding` を `serverExternalPackages` に追加する
- Vite では `@open-spaced-repetition/binding` を `optimizeDeps.exclude` に追加する

```ts
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  optimizeDeps: {
    exclude: ['@open-spaced-repetition/binding'],
  },
})
```

## 注意点

- **デフォルトの WASI 経路は edge runtime をサポートしていません。**
- ブラウザで使う場合は、WASM と worker を明示的にバンドルすることを推奨します。
- ブラウザでは `Cross-Origin-Opener-Policy: same-origin` と `Cross-Origin-Embedder-Policy: require-corp` を設定し、worker と WASM の読み込みで cross-origin isolation の問題が起きないようにしてください。
- 上記の Vite 例では `@open-spaced-repetition/binding-wasm32-wasi` を明示的にインストールする必要があります。
- dynamic ロードではなく pnpm `supportedArchitectures` を使う場合は、必要に応じて `@open-spaced-repetition/binding` をフレームワーク最適化から除外し、WASM アセットが落ちないようにしてください。
- スケジューリングだけが必要な場合は [`ts-fsrs`](https://www.npmjs.com/package/ts-fsrs) を使ってください。

## 例

- 学習スクリプト：[packages/binding-test/src/examples/simple.ts](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/binding-test/src/examples/simple.ts)
- Next.js 学習例：[examples/nextjs](https://github.com/open-spaced-repetition/ts-fsrs/tree/main/examples/nextjs)

## ドキュメント

- リポジトリ概要：[github.com/open-spaced-repetition/ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs#readme)
- スケジューラーパッケージ：[`ts-fsrs`](https://www.npmjs.com/package/ts-fsrs)
- 貢献ガイド：[CONTRIBUTING.md](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/CONTRIBUTING.md)
