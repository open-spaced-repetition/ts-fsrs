# ts-fsrs

[![対応 FSRS バージョン](https://img.shields.io/badge/FSRS-3%20%7C%204%20%7C%204.5%20%7C%205%20%7C%206%20%7C%207-blue?style=flat-square)](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/docs/src/ja-JP/guide/model/index.mdx)
[![npm version](https://img.shields.io/npm/v/ts-fsrs.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/ts-fsrs)
[![downloads](https://img.shields.io/npm/dm/ts-fsrs?style=flat-square)](https://www.npmjs.com/package/ts-fsrs)

[Introduction](./README.md) | [简体中文](./README_CN.md) | [はじめに](./README_JA.md)

**ts-fsrs は、Free Spaced Repetition Scheduler (FSRS) アルゴリズムを使って間隔反復システムを構築するための TypeScript パッケージです。**

ts-fsrs v6 は FSRS-3、FSRS-4、FSRS-4.5、FSRS-5、FSRS-6、FSRS-7 に対応しています。ライブラリのバージョンと FSRS モデルのバージョンは別のものです。

## 目次

- [インストール](#インストール)
- [クイックスタート](#クイックスタート)
- [設定](#設定)
- [想起確率（Retrievability）](#想起確率retrievability)
- [nextInterval](#nextinterval)
- [defineScheduler でスケジューラーを構成する](#definescheduler-でスケジューラーを構成する)
- [ドキュメント](#ドキュメント)
- [例](#例)
- [コントリビュート](#コントリビュート)

## インストール

`ts-fsrs` は Node.js `>=24.0.0` を必要とします。

```bash
npm install ts-fsrs
yarn add ts-fsrs
pnpm install ts-fsrs
bun add ts-fsrs
```

## クイックスタート

トップレベル `await` に対応した ES モジュールで実行します。

```ts
import { DefaultScheduler, Rating } from 'ts-fsrs'

const now = new Date('2026-01-01T00:00:00.000Z')
const scheduler = await DefaultScheduler()
const card = scheduler.newCard({ now })

const preview = scheduler.preview({ card, now })
for (const { grade, card: previewCard, revlog } of preview) {
  console.log(grade, previewCard, revlog)
}

const result = scheduler.review({ card, grade: Rating.Good, now })
console.log(result.card)
console.log(result.revlog)
```

`preview()` は Again、Hard、Good、Easy の 4 つの評価に対する反復可能な結果を返します。`review()` は新しいカードと復習ログを返し、入力カードを変更しません。アプリケーションでは `result.card` と `result.revlog` を保存してください。

`DefaultScheduler()` は `version` を省略すると FSRS-7 を使用し、目標保持率、統計、学習ステップ、最大間隔、単調間隔、スケジュール日数の標準ポリシーを含みます。ファジングはオプションで有効にできます。

## 設定

```ts
import { DefaultScheduler } from 'ts-fsrs'

const scheduler = await DefaultScheduler({
  version: 'FSRS-7',
  desiredRetention: 0.9,
  enableShortTerm: true,
  learningSteps: ['1m', '10m'],
  relearningSteps: ['10m'],
  enableFuzz: false,
  maximumInterval: 36_500,
})
```

`desiredRetention` は目標保持率で、値を高くすると復習負担が増えます。`maximumInterval` は最大間隔を日単位で制限します。`enableShortTerm`、`learningSteps`、`relearningSteps` は明示的な学習ステップを制御します。`enableFuzz` は長い間隔にランダムな揺らぎを加えます。`weights` を省略すると、選択したモデルのプリセット重みが使われます。

## 想起確率（Retrievability）

`scheduler.model.forgettingCurve(memoryState, elapsedDays)` で想起確率を推定します。モデルの完全な記憶状態を渡してください。FSRS-7 では `stability`、`stabilityFast`、`difficulty` が必要です。この例のカード状態は `reviewedAt` に記録され、scheduler の chrono が `checkedAt` までの経過日数を計算します。

```ts
import { DefaultScheduler, Rating } from 'ts-fsrs'

const scheduler = await DefaultScheduler()
const reviewedAt = new Date('2026-01-01T00:00:00.000Z')
const card = scheduler.newCard({ now: reviewedAt })
const result = scheduler.review({ card, grade: Rating.Good, now: reviewedAt })

const checkedAt = new Date('2026-01-02T12:00:00.000Z')
const elapsedDays = scheduler.chrono.difference(reviewedAt, checkedAt)
const retrievability = scheduler.model.forgettingCurve(result.card, elapsedDays)

console.log(retrievability)
```

戻り値は 0 から 1 の数値です。FSRS-7 は小数の日数を保持するため、この例では復習から 1.5 日後の想起確率を求めます。

## nextInterval

`scheduler.model.nextInterval(memoryState, desiredRetention)` はモデルの基本間隔を返します。計算済みの評価後の状態に構成した間隔ポリシーを適用するには、`scheduler.nextInterval(memoryState, desiredRetention, context)` を使います。

```ts
import { DefaultScheduler, Rating } from 'ts-fsrs'

const scheduler = await DefaultScheduler({ allowModelOverride: false })
const now = new Date('2026-01-01T00:00:00.000Z')
const card = scheduler.newCard({ now })
const grade = Rating.Good
const result = scheduler.review({ card, grade, now })

const baseInterval = scheduler.model.nextInterval(result.card, 0.9)
const interval = scheduler.nextInterval(result.card, 0.9, {
  card,
  grade,
  elapsedDays: 0,
})

console.log({ baseInterval, interval })
```

この例では `allowModelOverride` を無効にし、設定した学習ステップをポリシー間隔に反映させます。どちらの間隔も日単位です。context には復習前のカード、選択した評価、その復習までの経過日数を渡し、第1引数には評価後の記憶状態を渡します。この例では新しいカードを直ちに復習するため、`elapsedDays` は `0` です。scheduler の問い合わせは `nextInterval` middleware だけを実行し、カードを進めたり復習ログを生成したりしません。最終的なカードとログは `review()` で取得してください。

## defineScheduler でスケジューラーを構成する

`defineScheduler({ model, chrono })` は再利用可能な definition を作成します。モデルは記憶状態と間隔を計算し、chrono は時刻の表現と演算を担当します。`.use(...)` でスケジューリングポリシーを追加し、`.create({ config })` でユーザーやコレクションの設定を検証して独立したスケジューラーを作成します。`DefaultScheduler()` は同じ構成 API を使った既成のプリセットです。

```ts
import { dateChrono, defineScheduler, Rating } from 'ts-fsrs'
import { schedulerDesiredRetentionMiddleware } from 'ts-fsrs/middlewares'
import { FSRS7_DEFAULT_WEIGHTS, FSRS7Model } from 'ts-fsrs/models/fsrs-7'

const schedulerDefinition = defineScheduler({
  model: FSRS7Model,
  chrono: dateChrono,
}).use(schedulerDesiredRetentionMiddleware)

const scheduler = schedulerDefinition.create({
  config: {
    weights: FSRS7_DEFAULT_WEIGHTS,
    fractionalDays: true,
    desiredRetention: 0.9,
  },
})

const now = new Date('2026-01-01T00:00:00.000Z')
const card = scheduler.newCard({ now })
const result = scheduler.review({ card, grade: Rating.Good, now })

console.log(result.card)
console.log(result.revlog)
```

構成した definition をプログラム共通のプリセットとして保持し、設定ごとにスケジューラーを作成します。この例では目標保持率のポリシーだけを追加しています。学習ステップ、統計、ファジング、間隔制限が必要なら、対応する middleware を明示的に追加してください。高度なスケジューリングや履歴操作は下記のガイドを参照してください。

## ドキュメント

- [クイックスタート](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/docs/src/ja-JP/guide/quick-start.mdx)
- [スケジューラーと時刻体系](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/docs/src/ja-JP/guide/scheduler/index.mdx)
- [モデル](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/docs/src/ja-JP/guide/model/index.mdx)
- [Middleware](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/docs/src/ja-JP/guide/middleware/index.mdx)
- [v5 → v6 と FSRS-7 への移行](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/docs/src/ja-JP/guide/migration.mdx)
- [オプティマイザーガイド](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/docs/src/ja-JP/guide/optimizer/index.mdx)：パラメーターの学習や復習ログ CSV の変換には、[`@open-spaced-repetition/binding`](https://www.npmjs.com/package/@open-spaced-repetition/binding) を別途インストールします。

## 例

- フルスタックデモ：[ts-fsrs-demo](https://github.com/ishiko732/ts-fsrs-demo)
- その他の例：
  - [spaced](https://github.com/zsh-eng/spaced)
  - [Anki Search Stats Extended](https://github.com/Luc-Mcgrady/Anki-Search-Stats-Extended)

## コントリビュート

貢献ガイドは [`CONTRIBUTING.md`](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/CONTRIBUTING.md) を参照してください。
