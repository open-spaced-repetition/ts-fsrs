[Introduction](./README.md) | [简体中文](./README_CN.md) ｜[はじめに](./README_JA.md)

---

# ts-fsrs

[![codecov](https://img.shields.io/codecov/c/github/open-spaced-repetition/ts-fsrs?token=E3KLLDL8QH&style=flat-square&logo=codecov)](https://codecov.io/gh/open-spaced-repetition/ts-fsrs)
[![Release](https://img.shields.io/github/actions/workflow/status/open-spaced-repetition/ts-fsrs/release.yml?style=flat-square&logo=githubactions&label=Release)](https://github.com/open-spaced-repetition/ts-fsrs/actions/workflows/release.yml)

**ts-fsrs is a TypeScript toolkit for building spaced repetition systems with FSRS.**

## Packages

This repository contains two main packages:

| Package | Description | Supported FSRS Versions | Package Version | Downloads |
| --- | --- | --- | --- | --- |
| [`ts-fsrs`](./packages/fsrs/README.md) | the scheduler for review flows | [![fsrs version](https://img.shields.io/badge/FSRS-3%20%7C%204%20%7C%204.5%20%7C%205%20%7C%206%20%7C%207-blue?style=flat-square)](./docs/src/en-US/guide/model/index.mdx) | [![ts-fsrs npm version](https://img.shields.io/npm/v/ts-fsrs.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/ts-fsrs) | [![ts-fsrs npm monthly downloads](https://img.shields.io/npm/dm/ts-fsrs?style=flat-square)](https://www.npmjs.com/package/ts-fsrs) [![ts-fsrs npm total downloads](https://img.shields.io/npm/dt/ts-fsrs?style=flat-square)](https://www.npmjs.com/package/ts-fsrs) |
| [`@open-spaced-repetition/binding`](./packages/binding/README.md) | the optimizer for parameter training and CSV conversion | [![fsrs version](https://img.shields.io/badge/FSRS-6%20%7C%207-blue?style=flat-square)](./docs/src/en-US/guide/optimizer/index.mdx) | [![binding npm version](https://img.shields.io/npm/v/@open-spaced-repetition/binding.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/@open-spaced-repetition/binding) | [![binding npm monthly downloads](https://img.shields.io/npm/dm/%40open-spaced-repetition%2Fbinding?style=flat-square)](https://www.npmjs.com/package/@open-spaced-repetition/binding) [![binding npm total downloads](https://img.shields.io/npm/dt/%40open-spaced-repetition%2Fbinding?style=flat-square)](https://www.npmjs.com/package/@open-spaced-repetition/binding) |

## Installation

`ts-fsrs` v6 and `@open-spaced-repetition/binding` require Node.js `>=24.0.0`.

```bash
pnpm add ts-fsrs
```

If you also need parameter optimization from review logs:

```bash
pnpm add @open-spaced-repetition/binding
```

## Basic Usage

Use `DefaultScheduler()` to schedule reviews with `ts-fsrs` v6. It defaults to FSRS-7; the library version and the FSRS model version are independent.

```ts
import { DefaultScheduler, Rating } from 'ts-fsrs'

const now = new Date('2026-01-01T00:00:00.000Z')
const scheduler = await DefaultScheduler()
const card = scheduler.newCard({ now })

// Preview all four possible outcomes before the user answers.
const preview = scheduler.preview({ card, now })
for (const { grade, card: previewCard, revlog } of preview) {
  console.log(grade, previewCard, revlog)
}

// Apply the final rating after the user has already answered.
const result = scheduler.review({ card, grade: Rating.Good, now })

console.log(result.card)
console.log(result.revlog)
```

Use `@open-spaced-repetition/binding` when you want to train FSRS parameters from review logs. For CSV conversion, timezone handling, browser/WASI setup, and training examples, see [`packages/binding/README.md`](./packages/binding/README.md).

## More Documentation

For detailed usage, advanced examples, browser/WASI setup, and API notes:

- [`packages/fsrs/README.md`](./packages/fsrs/README.md)
- [`packages/binding/README.md`](./packages/binding/README.md)
- [Quick start](./docs/src/en-US/guide/quick-start.mdx)
- [v5 → v6 and FSRS-7 migration](./docs/src/en-US/guide/migration.mdx)

## Examples

- [`ts-fsrs` package examples](./packages/fsrs/README.md#examples)
- [`@open-spaced-repetition/binding` package examples](./packages/binding/README.md#examples)

## Other Implementations

FSRS is also available in other languages and ecosystems:

- [awesome-fsrs implementations](https://github.com/open-spaced-repetition/awesome-fsrs?tab=readme-ov-file#implementation)

## Contribute

For how to setup a local development eniroment, how to set up a Dev Container, and contribution guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md).
