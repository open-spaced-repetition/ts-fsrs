[Introduction](./README.md) | [简体中文](./README_CN.md) ｜[はじめに](./README_JA.md)

---

# ts-fsrs

[![fsrs version](https://img.shields.io/badge/FSRS-v6-blue?style=flat-square)](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm#fsrs-6)
[![codecov](https://img.shields.io/codecov/c/github/open-spaced-repetition/ts-fsrs?token=E3KLLDL8QH&style=flat-square&logo=codecov)](https://codecov.io/gh/open-spaced-repetition/ts-fsrs)
[![Release](https://img.shields.io/github/actions/workflow/status/open-spaced-repetition/ts-fsrs/release.yml?style=flat-square&logo=githubactions&label=Release)](https://github.com/open-spaced-repetition/ts-fsrs/actions/workflows/release.yml)
[![Deploy](https://img.shields.io/github/actions/workflow/status/open-spaced-repetition/ts-fsrs/deploy.yml?style=flat-square&logo=githubpages&label=Pages)](https://github.com/open-spaced-repetition/ts-fsrs/actions/workflows/deploy.yml)

**ts-fsrs は、FSRS を使った間隔反復システムを構築するための TypeScript ツールキットです。**

## パッケージ

このリポジトリには主に 2 つのパッケージがあります。

| パッケージ | 説明 | FSRS バージョン | パッケージ版 | ダウンロード数 |
| --- | --- | --- | --- | --- |
| [`ts-fsrs`](./packages/fsrs/README.md) | 復習フローを構築するためのスケジューラー | [![fsrs version](https://img.shields.io/badge/FSRS-v6-blue?style=flat-square)](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm#fsrs-6) | [![ts-fsrs npm version](https://img.shields.io/npm/v/ts-fsrs.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/ts-fsrs) | [![ts-fsrs npm monthly downloads](https://img.shields.io/npm/dm/ts-fsrs?style=flat-square)](https://www.npmjs.com/package/ts-fsrs) [![ts-fsrs npm total downloads](https://img.shields.io/npm/dt/ts-fsrs?style=flat-square)](https://www.npmjs.com/package/ts-fsrs) |
| [`@open-spaced-repetition/binding`](./packages/binding/README.md) | パラメータ学習と CSV 変換のための高性能オプティマイザー | [![fsrs version](https://img.shields.io/badge/FSRS-v6-blue?style=flat-square)](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm#fsrs-6) | [![binding npm version](https://img.shields.io/npm/v/@open-spaced-repetition/binding.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/@open-spaced-repetition/binding) | [![binding npm monthly downloads](https://img.shields.io/npm/dm/%40open-spaced-repetition%2Fbinding?style=flat-square)](https://www.npmjs.com/package/@open-spaced-repetition/binding) [![binding npm total downloads](https://img.shields.io/npm/dt/%40open-spaced-repetition%2Fbinding?style=flat-square)](https://www.npmjs.com/package/@open-spaced-repetition/binding) |

## インストール

`ts-fsrs` は Node.js `>=20.0.0` が必要です。

```bash
pnpm add ts-fsrs
```

復習ログからパラメータ最適化も行いたい場合は、こちらも追加してください。

```bash
pnpm add @open-spaced-repetition/binding
```

## 基本的な使い方

`ts-fsrs` を使って復習をスケジュールします。

```ts
import { createEmptyCard, fsrs, Rating } from 'ts-fsrs'

const scheduler = fsrs()
const card = createEmptyCard()

// ユーザーが回答する前に、4 つの評価結果をプレビューします。
const preview = scheduler.repeat(card, new Date())
// ユーザー回答後に、最終評価を適用してカードとログを確定します。
const result = scheduler.next(card, new Date(), Rating.Good)

console.log(preview[Rating.Good].card)
console.log(result.card)
console.log(result.log)
```

復習ログから FSRS パラメータを学習したい場合は、[`packages/binding/README.md`](./packages/binding/README.md) を参照してください。CSV 変換、タイムゾーン処理、ブラウザ/WASI 設定、学習例をまとめています。

## 詳細ドキュメント

詳細な使い方、高度な例、ブラウザ/WASI 設定、API 情報は次を参照してください。

- [`packages/fsrs/README.md`](./packages/fsrs/README.md)
- [`packages/binding/README.md`](./packages/binding/README.md)
- [TypeDoc API ドキュメント](https://open-spaced-repetition.github.io/ts-fsrs/)
- [ワークフロー図](./ts-fsrs-workflow.drawio)

## 例

- [`ts-fsrs` パッケージの例](./packages/fsrs/README.md#examples)
- [`@open-spaced-repetition/binding` パッケージの例](./packages/binding/README.md#examples)

## 他言語実装

FSRS には他の言語やエコシステム向けの実装もあります。

- [awesome-fsrs implementations](https://github.com/open-spaced-repetition/awesome-fsrs?tab=readme-ov-file#implementation)

## コントリビュート

開発環境、Dev Container、コントリビューション手順は [CONTRIBUTING.md](./CONTRIBUTING.md) を参照してください。
