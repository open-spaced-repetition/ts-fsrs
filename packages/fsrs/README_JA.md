# ts-fsrs

[Introduction](./README.md) | [简体中文](./README_CN.md) | [はじめに](./README_JA.md)

[![fsrs version](https://img.shields.io/badge/FSRS-v6-blue?style=flat-square)](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm#fsrs-6)
[![npm version](https://img.shields.io/npm/v/ts-fsrs.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/ts-fsrs)
[![downloads](https://img.shields.io/npm/dm/ts-fsrs?style=flat-square)](https://www.npmjs.com/package/ts-fsrs)

**ts-fsrs は、Free Spaced Repetition Scheduler (FSRS) アルゴリズムを使って独自の間隔反復システムを構築するための TypeScript パッケージです。**

## 目次

- [ts-fsrs](#ts-fsrs)
  - [目次](#目次)
  - [インストール](#インストール)
  - [クイックスタート](#クイックスタート)
  - [使い方](#使い方)
    - [カスタムパラメータ](#カスタムパラメータ)
    - [`generatorParameters`](#generatorparameters)
    - [`repeat` と `next`](#repeat-と-next)
    - [想起確率](#想起確率)
    - [`next_state` と `next_interval`](#next_state-と-next_interval)
    - [履歴関連のヘルパー](#履歴関連のヘルパー)
  - [リファレンス](#リファレンス)
  - [API ドキュメント](#api-ドキュメント)
  - [例](#例)
  - [コントリビュート](#コントリビュート)

## インストール

`ts-fsrs` は Node.js `>=20.0.0` を必要とします。

```bash
npm install ts-fsrs
yarn add ts-fsrs
pnpm install ts-fsrs
bun add ts-fsrs
```

## クイックスタート

スケジューラーを初期化します。

```ts
import { createEmptyCard, fsrs, Rating } from 'ts-fsrs'

const scheduler = fsrs()
```

新しいカードを作成します。

```ts
const card = createEmptyCard()
```

4 つの評価に対する結果をまとめてプレビューします。

```ts
const preview = scheduler.repeat(card, new Date())

console.log(preview[Rating.Again].card)
console.log(preview[Rating.Hard].card)
console.log(preview[Rating.Good].card)
console.log(preview[Rating.Easy].card)
```

ユーザーの評価がすでに確定している場合は、その評価を直接適用します。

```ts
const result = scheduler.next(card, new Date(), Rating.Good)

console.log(result.card)
console.log(result.log)
```

## 使い方

### カスタムパラメータ

```ts
import { fsrs } from 'ts-fsrs'

const scheduler = fsrs({
  request_retention: 0.9,
  maximum_interval: 36500,
  enable_fuzz: true,
  enable_short_term: true,
  learning_steps: ['1m', '10m'],
  relearning_steps: ['10m'],
})
```

`request_retention` は、スケジューラーが維持したい最低保持率（0%から100%）を表します。値を高くすると復習回数は増え、低くすると減ります。

`maximum_interval` は、カードをどれだけ先までスケジュールできるかの上限です。

`enable_fuzz` は、長い間隔に少量のランダムな揺らぎを加えます。

`enable_short_term`、`learning_steps`、`relearning_steps` は短期学習と再学習のステップ挙動を制御します。

### `generatorParameters`

`fsrs()` は内部で `generatorParameters()` を使って入力を正規化するため、通常の初期化では部分的な設定オブジェクトをそのまま `fsrs()` に渡せます。

`generatorParameters()` は、シリアライズ、保存、または完全な `FSRSParameters` オブジェクトの再利用が必要な場合に使ってください。

```ts
import { fsrs, generatorParameters } from 'ts-fsrs'

const params = generatorParameters({
  request_retention: 0.9,
  maximum_interval: 36500,
})

console.log(JSON.stringify(params))

const scheduler = fsrs(params)
```

保存したパラメータをあとで読み込む場合も、パースしたオブジェクトをそのまま `fsrs()` に渡せます。

```ts
import { fsrs, type FSRSParameters } from 'ts-fsrs'

const serializedParams = '{"request_retention":0.9,"maximum_interval":36500}'
const params = JSON.parse(serializedParams) as FSRSParameters
const scheduler = fsrs(params)
```

これらのパラメータが外部ストレージ、ユーザー入力、またはネットワークから来る場合は、`fsrs()` に渡す前にアプリケーション境界でランタイム検証を行うことを推奨します。`zod` のようなランタイム schema ライブラリはこの用途に適しています。

### `repeat` と `next`

ユーザーが回答する前に 4 通りの結果を見たい場合は `repeat` を使います。

```ts
const preview = scheduler.repeat(card, new Date())
```

ユーザーの評価がすでに分かっている場合は `next` を使います。

```ts
const result = scheduler.next(card, new Date(), Rating.Good)
```

結果をそのまま自分の保存形式に変換したい場合は `afterHandler` を使えます。

```ts
const saved = scheduler.next(card, new Date(), Rating.Good, ({ card, log }) => ({
  card: {
    ...card,
    due: card.due.getTime(),
    last_review: card.last_review?.getTime() ?? null,
  },
  log: {
    ...log,
    due: log.due.getTime(),
    review: log.review.getTime(),
  },
}))
```

### 想起確率

```ts
const retrievability = scheduler.get_retrievability(result.card, new Date(), false)
console.log(retrievability)
```

`elapsed_days`、`stability`、そして有効な decay 値がすでにある場合は、`forgetting_curve()` を直接使って想起確率を計算することもできます。

```ts
import { forgetting_curve } from 'ts-fsrs'

const retrievability = forgetting_curve(0.5, 12, result.card.stability)
console.log(retrievability)
```

decay 値を直接渡す場合は、正の数であり、`0.1` から `0.8` の範囲内である必要があります。

### `next_state` と `next_interval`

記憶状態を直接扱う場合は、`next_state()` と `next_interval()` を組み合わせて使えます。

```ts
import { fsrs, Rating, type FSRSState } from 'ts-fsrs'

const scheduler = fsrs({ enable_fuzz: false })

const memoryState: FSRSState = {
  stability: 3.2,
  difficulty: 5.6,
}

const elapsedDays = 12
const nextState = scheduler.next_state(memoryState, elapsedDays, Rating.Good)
const nextInterval = scheduler.next_interval(nextState.stability, elapsedDays)

console.log(nextState)
console.log(nextInterval)
```

これはシミュレーション、分析、または `{ stability, difficulty }` を自前で扱うカスタムスケジューリングに便利です。通常の復習フローでは `repeat()` または `next()` を使うほうが自然です。

### 履歴関連のヘルパー

スケジューラーは次の補助メソッドも提供します。

- `rollback(card, log)`
- `forget(card, now, reset_count?)`
- `reschedule(card, reviews, options?)`

これらは、既存データのインポート、履歴の再生、保存済みログからの状態再構築に便利です。

## リファレンス

カードの状態：

```ts
State.New
State.Learning
State.Review
State.Relearning
```

レビュー評価：

```ts
Rating.Again
Rating.Hard
Rating.Good
Rating.Easy
```

## API ドキュメント

- リポジトリ概要：[github.com/open-spaced-repetition/ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs#readme)
- TypeDoc API ドキュメント：[open-spaced-repetition.github.io/ts-fsrs](https://open-spaced-repetition.github.io/ts-fsrs/)
- オプティマイザーパッケージ：[`@open-spaced-repetition/binding`](https://www.npmjs.com/package/@open-spaced-repetition/binding)

## 例

- ブラウザ例：[example/example.html](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/example/example.html)
- フルスタックデモ：[ts-fsrs-demo](https://github.com/ishiko732/ts-fsrs-demo)
- その他の例：
  - [spaced](https://github.com/zsh-eng/spaced)
  - [Anki Search Stats Extended](https://github.com/Luc-Mcgrady/Anki-Search-Stats-Extended)

## コントリビュート

貢献ガイドは [`CONTRIBUTING.md`](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/CONTRIBUTING.md) を参照してください。
