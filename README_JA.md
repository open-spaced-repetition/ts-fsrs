[Introduction](./README.md) | [简体中文](./README_CN.md) ｜[はじめに](./README_JA.md)

---

# について

[![ts-fsrs npm version](https://img.shields.io/npm/v/ts-fsrs.svg)](https://www.npmjs.com/package/ts-fsrs)
[![codecov](https://codecov.io/gh/open-spaced-repetition/ts-fsrs/graph/badge.svg?token=E3KLLDL8QH)](https://codecov.io/gh/open-spaced-repetition/ts-fsrs)
[![Build and Publish](https://github.com/open-spaced-repetition/ts-fsrs/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/open-spaced-repetition/ts-fsrs/actions/workflows/npm-publish.yml)
[![Deploy](https://github.com/open-spaced-repetition/ts-fsrs/actions/workflows/deploy.yml/badge.svg)](https://github.com/open-spaced-repetition/ts-fsrs/actions/workflows/deploy.yml)

ts-fsrsはTypeScriptに基づいた多機能なパッケージで、[ESモジュール]((https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c))、[CommonJS](https://en.wikipedia.org/wiki/CommonJS)、UMDに対応しています。[自由間隔重複スケジューラ（FSRS）アルゴリズム](https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler) を実装しており、開発者がFSRSをフラッシュカードアプリケーションに統合することで、ユーザーの学習体験を向上させることができます。

ts-fsrsのワークフローについては、以下のリソースを参照してください。
> - google driver: [ts-fsrs-workflow.drawio](https://drive.google.com/file/d/1FLKjpt4T3Iis02vjoA10q7vxKCWwClfR/view?usp=sharing) (コメントを提供できます)
> - github: [ts-fsrs-workflow.drawio](./ts-fsrs-workflow.drawio)


# ts-fsrsの使用方法

`ts-fsrs@3.x`はNode.js（>=16.0.0）で動作する必要があります。`ts-fsrs@4.x`からは、最小必要なNode.jsバージョンは18.0.0です。
`ts-fsrs@3.5.6`以降、ts-fsrsはCommonJS、ESM、UMDモジュールシステムをサポートしています。

```
npm install ts-fsrs
yarn install ts-fsrs
pnpm install ts-fsrs
bun install ts-fsrs
```

# 例

```typescript
import {createEmptyCard, formatDate, fsrs, generatorParameters, Rating, Grades} from 'ts-fsrs';

const params = generatorParameters({ enable_fuzz: true, enable_short_term: false });
const f = fsrs(params);
const card = createEmptyCard(new Date('2022-2-1 10:00:00'));// createEmptyCard();
const now = new Date('2022-2-2 10:00:00');// new Date();
const scheduling_cards = f.repeat(card, now);

// console.log(scheduling_cards);
for (const item of scheduling_cards) {
    // grades = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]
    const grade = item.log.rating
    const { log, card } = item;
    console.group(`${Rating[grade]}`);
    console.table({
        [`card_${Rating[grade]}`]: {
            ...card,
            due: formatDate(card.due),
            last_review: formatDate(card.last_review as Date),
        },
    });
    console.table({
        [`log_${Rating[grade]}`]: {
            ...log,
            review: formatDate(log.review),
        },
    });
    console.groupEnd();
    console.log('----------------------------------------------------------------');
}
```

もっと:

- [参考資料- Github Pages](https://open-spaced-repetition.github.io/ts-fsrs/)
- [参考スケジューラ - Github Pages](https://open-spaced-repetition.github.io/ts-fsrs/example)
- [ブラウザで使い方](https://github.com/open-spaced-repetition/ts-fsrs/blob/master/example/example.html) (CDNを使用して ts-fsrs ESM
  パッケージにアクセスする)
- [実際のケース - Next.js+Prismaを利用する](https://github.com/ishiko732/ts-fsrs-demo)
- [モダンなフラッシュカード - Next.jsやtRPCなど技術を利用している](https://github.com/zsh-eng/spaced)

# 基本的な使い方

## 1. **初期化**:

まずは、空ぽっいカードインスタンスを作成して、現在の日付を設定します（デフォルトはシステムの現在時刻）：

```typescript
import {Card, createEmptyCard} from "ts-fsrs";

let card: Card = createEmptyCard();
// createEmptyCard(new Date('2022-2-1 10:00:00'));
// createEmptyCard(new Date(Date.UTC(2023, 9, 18, 14, 32, 3, 370)));
// createEmptyCard(new Date('2023-09-18T14:32:03.370Z'));
```

## 2. **FSRSのパラメータ設定**:

このts-fsrsライブラリは、カスタムSRSパラメータを許可します。`generatorParameters`
を使用して、SRSアルゴリズムの最終パラメータセットを生成します。以下は、最大間隔を設定する例です：

```typescript
import {Card, createEmptyCard, generatorParameters, FSRSParameters} from "ts-fsrs";

let card: Card = createEmptyCard();
const params: FSRSParameters = generatorParameters({maximum_interval: 1000});
```

## 3. **FSRSを使いしてスケジューリングする**:

核心機能は「`fsrs`」関数にあります。この`repeat`関数を呼び出すと、異なるユーザー評価に基づいて、カードセットのスケジュール結果が返されます。

```typescript
import {
    Card,
    createEmptyCard,
    generatorParameters,
    FSRSParameters,
    FSRS,
    RecordLog,
} from "ts-fsrs";

let card: Card = createEmptyCard();
const f: FSRS = new FSRS(); // or const f: FSRS = fsrs(params);
let scheduling_cards: RecordLog = f.repeat(card, new Date());
// もしくは、開発者が評価を指定する場合：（ＴＳ－ＦＳＲＳのバージョンは4.0.0以降である必要があります）
// let scheduling_cards: RecordLog = f.repeat(card, new Date(), Rating.Good);
```

## 4. **スケジュールされたカードの取得**:

scheduling_cardsオブジェクトがあると、ユーザーの評価に基づいてカードを取得できます。例えば、`Good`評価でスケジュールされたカードにアクセスするには：

```typescript
const good: RecordLogItem = scheduling_cards[Rating.Good];
const newCard: Card = good.card;
```

もちろん、各評価に対応するカードの新しい状態と履歴を取得できます：

```typescript
scheduling_cards[Rating.Again].card
scheduling_cards[Rating.Again].log

scheduling_cards[Rating.Hard].card
scheduling_cards[Rating.Hard].log

scheduling_cards[Rating.Good].card
scheduling_cards[Rating.Good].log

scheduling_cards[Rating.Easy].card
scheduling_cards[Rating.Easy].log
```

## 5. **カード属性の理解**:

それぞれの`Card`オブジェクトは、その状態、スケジュール、その他の指標を決定するさまざまな属性を含んでいます：

```typescript
type Card = {
    due: Date;             // カードの次のレビュー日
    stability: number;     //　記憶の安定性
    difficulty: number;    // カードの難易度
    elapsed_days: number;  // 前回のレビューからの日数
    scheduled_days: number; // 次のレビューの間隔日数
    reps: number;          // カードのレビュー回数
    lapses: number;        // カードが忘れられたか、間違って覚えられた回数
    state: State;          // カードの現在の状態（新しいカード、学習中、レビュー中、再学習中）
    last_review?: Date;    // 最近のレビュー日（適用される場合）
};
```

## 6. **レビュー履歴属性の理解**:

それぞれの`ReviewLog`
オブジェクトは、そのカードに関連するレビュー記録情報を決定するさまざまな属性を含んでいます。分析、今回のレビューをやり直す、[最適化(作成中)](https://github.com/open-spaced-repetition/fsrs-optimizer)：

```typescript
type ReviewLog = {
    rating: Rating; // レビューの評価（手動変更、やり直し、難しい、良い、簡単）
    state: State; // レビューの状態（新しいカード、学習中、レビュー中、再学習中）
    due: Date;  // レビューの次の日付
    stability: number; // レビュー前の記憶の安定性
    difficulty: number; // レビュー前のカードの難易度
    elapsed_days: number; // 前回のレビューからの日数
    last_elapsed_days: number; // 前回のレビューの間隔日数
    scheduled_days: number; // 次のレビューの間隔日数
    review: Date; // レビュー日
}
```