[Introduction](./README.md) | [简体中文](./README_CN.md) ｜[はじめに](./README_JA.md)

---

# ts-fsrs

[![fsrs version](https://img.shields.io/badge/FSRS-3%20%7C%204%20%7C%204.5%20%7C%205%20%7C%206%20%7C%207-blue?style=flat-square)](./docs/src/ja-JP/guide/model/index.mdx)
[![codecov](https://img.shields.io/codecov/c/github/open-spaced-repetition/ts-fsrs?token=E3KLLDL8QH&style=flat-square&logo=codecov)](https://codecov.io/gh/open-spaced-repetition/ts-fsrs)
[![Release](https://img.shields.io/github/actions/workflow/status/open-spaced-repetition/ts-fsrs/release.yml?style=flat-square&logo=githubactions&label=Release)](https://github.com/open-spaced-repetition/ts-fsrs/actions/workflows/release.yml)

**ts-fsrs は、FSRS を使った間隔反復システムを構築するための TypeScript ツールキットです。**

## パッケージ

このリポジトリには主に 2 つのパッケージがあります。

| パッケージ | 説明 | 対応 FSRS バージョン | パッケージ版 | ダウンロード数 |
| --- | --- | --- | --- | --- |
| [`ts-fsrs`](./packages/fsrs/README_JA.md) | 復習フローを構築するためのスケジューラー | [![fsrs version](https://img.shields.io/badge/FSRS-3%20%7C%204%20%7C%204.5%20%7C%205%20%7C%206%20%7C%207-blue?style=flat-square)](./docs/src/ja-JP/guide/model/index.mdx) | [![ts-fsrs npm version](https://img.shields.io/npm/v/ts-fsrs.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/ts-fsrs) | [![ts-fsrs npm monthly downloads](https://img.shields.io/npm/dm/ts-fsrs?style=flat-square)](https://www.npmjs.com/package/ts-fsrs) [![ts-fsrs npm total downloads](https://img.shields.io/npm/dt/ts-fsrs?style=flat-square)](https://www.npmjs.com/package/ts-fsrs) |
| [`@open-spaced-repetition/binding`](./packages/binding/README_JA.md) | パラメータ学習と CSV 変換のための高性能オプティマイザー | [![fsrs version](https://img.shields.io/badge/FSRS-6%20%7C%207-blue?style=flat-square)](./docs/src/ja-JP/guide/optimizer/index.mdx) | [![binding npm version](https://img.shields.io/npm/v/@open-spaced-repetition/binding.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/@open-spaced-repetition/binding) | [![binding npm monthly downloads](https://img.shields.io/npm/dm/%40open-spaced-repetition%2Fbinding?style=flat-square)](https://www.npmjs.com/package/@open-spaced-repetition/binding) [![binding npm total downloads](https://img.shields.io/npm/dt/%40open-spaced-repetition%2Fbinding?style=flat-square)](https://www.npmjs.com/package/@open-spaced-repetition/binding) |

## インストール

`ts-fsrs` v6 と `@open-spaced-repetition/binding` は Node.js `>=24.0.0` を必要とします。

```bash
pnpm add ts-fsrs
```

復習ログからパラメータ最適化も行いたい場合は、こちらも追加してください。

```bash
pnpm add @open-spaced-repetition/binding
```

## 基本的な使い方

`DefaultScheduler()` で `ts-fsrs` v6 の復習をスケジュールします。既定のモデルは FSRS-7 です。ライブラリのバージョンと FSRS モデルのバージョンは別のものです。

```ts
import { DefaultScheduler, Rating } from 'ts-fsrs'

const now = new Date('2026-01-01T00:00:00.000Z')
const scheduler = await DefaultScheduler()
const card = scheduler.newCard({ now })

// ユーザーが回答する前に、4 つの評価結果をプレビューします。
const preview = scheduler.preview({ card, now })
for (const { grade, card: previewCard, revlog } of preview) {
  console.log(grade, previewCard, revlog)
}

// ユーザー回答後に、最終評価を適用してカードとログを確定します。
const result = scheduler.review({ card, grade: Rating.Good, now })

console.log(result.card)
console.log(result.revlog)
```

復習ログから FSRS パラメータを学習したい場合は、[`packages/binding/README_JA.md`](./packages/binding/README_JA.md) を参照してください。CSV 変換、タイムゾーン処理、ブラウザ/WASI 設定、学習例をまとめています。

## 詳細ドキュメント

詳細な使い方、高度な例、ブラウザ/WASI 設定、API 情報は次を参照してください。

- [`packages/fsrs/README_JA.md`](./packages/fsrs/README_JA.md)
- [`packages/binding/README_JA.md`](./packages/binding/README_JA.md)
- [クイックスタート](./docs/src/ja-JP/guide/quick-start.mdx)
- [v5 → v6 と FSRS-7 への移行](./docs/src/ja-JP/guide/migration.mdx)

## 例

- [`ts-fsrs` パッケージの例](./packages/fsrs/README_JA.md#例)
- [`@open-spaced-repetition/binding` パッケージの例](./packages/binding/README_JA.md#例)

## 他言語実装

FSRS には他の言語やエコシステム向けの実装もあります。

- [awesome-fsrs implementations](https://github.com/open-spaced-repetition/awesome-fsrs?tab=readme-ov-file#implementation)

## コントリビュート

どうやって開発環境をセットアップするか、Dev Container を使った迅速な開発方法、コントリビューション手順は [CONTRIBUTING.md](./CONTRIBUTING.md) を参照してください。
