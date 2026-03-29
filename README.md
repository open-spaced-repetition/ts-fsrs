[Introduction](./README.md) | [简体中文](./README_CN.md) ｜[はじめに](./README_JA.md)

---

# ts-fsrs

[![codecov](https://img.shields.io/codecov/c/github/open-spaced-repetition/ts-fsrs?token=E3KLLDL8QH&style=flat-square&logo=codecov)](https://codecov.io/gh/open-spaced-repetition/ts-fsrs)
[![Release](https://img.shields.io/github/actions/workflow/status/open-spaced-repetition/ts-fsrs/release.yml?style=flat-square&logo=githubactions&label=Release)](https://github.com/open-spaced-repetition/ts-fsrs/actions/workflows/release.yml)
[![Deploy](https://img.shields.io/github/actions/workflow/status/open-spaced-repetition/ts-fsrs/deploy.yml?style=flat-square&logo=githubpages&label=Pages)](https://github.com/open-spaced-repetition/ts-fsrs/actions/workflows/deploy.yml)

**ts-fsrs is a TypeScript toolkit for building spaced repetition systems with FSRS.**

## Packages

This repository contains two main packages:

| Package | Description | FSRS Version | Package Version | Downloads |
| --- | --- | --- | --- | --- |
| [`ts-fsrs`](./packages/fsrs/README.md) | the scheduler for review flows | [![fsrs version](https://img.shields.io/badge/FSRS-v6-blue?style=flat-square)](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm#fsrs-6) | [![ts-fsrs npm version](https://img.shields.io/npm/v/ts-fsrs.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/ts-fsrs) | [![ts-fsrs npm monthly downloads](https://img.shields.io/npm/dm/ts-fsrs?style=flat-square)](https://www.npmjs.com/package/ts-fsrs) [![ts-fsrs npm total downloads](https://img.shields.io/npm/dt/ts-fsrs?style=flat-square)](https://www.npmjs.com/package/ts-fsrs) |
| [`@open-spaced-repetition/binding`](./packages/binding/README.md) | the optimizer for parameter training and CSV conversion | [![fsrs version](https://img.shields.io/badge/FSRS-v6-blue?style=flat-square)](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm#fsrs-6) | [![binding npm version](https://img.shields.io/npm/v/@open-spaced-repetition/binding.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/@open-spaced-repetition/binding) | [![binding npm monthly downloads](https://img.shields.io/npm/dm/%40open-spaced-repetition%2Fbinding?style=flat-square)](https://www.npmjs.com/package/@open-spaced-repetition/binding) [![binding npm total downloads](https://img.shields.io/npm/dt/%40open-spaced-repetition%2Fbinding?style=flat-square)](https://www.npmjs.com/package/@open-spaced-repetition/binding) |

## Installation

`ts-fsrs` requires Node.js `>=20.0.0`.

```bash
pnpm add ts-fsrs
```

If you also need parameter optimization from review logs:

```bash
pnpm add @open-spaced-repetition/binding
```

## Basic Usage

Use `ts-fsrs` to schedule reviews:

```ts
import { createEmptyCard, fsrs, Rating } from 'ts-fsrs'

const scheduler = fsrs()
const card = createEmptyCard()

// Preview all four possible outcomes before the user answers.
const preview = scheduler.repeat(card, new Date())
// Apply the final rating after the user has already answered.
const result = scheduler.next(card, new Date(), Rating.Good)

console.log(preview[Rating.Good].card)
console.log(result.card)
console.log(result.log)
```

Use `@open-spaced-repetition/binding` when you want to train FSRS parameters from review logs. For CSV conversion, timezone handling, browser/WASI setup, and training examples, see [`packages/binding/README.md`](./packages/binding/README.md).

## More Documentation

For detailed usage, advanced examples, browser/WASI setup, and API notes:

- [`packages/fsrs/README.md`](./packages/fsrs/README.md)
- [`packages/binding/README.md`](./packages/binding/README.md)
- [TypeDoc API docs](https://open-spaced-repetition.github.io/ts-fsrs/)
- [Workflow diagram](./ts-fsrs-workflow.drawio)

## Examples

- [`ts-fsrs` package examples](./packages/fsrs/README.md#examples)
- [`@open-spaced-repetition/binding` package examples](./packages/binding/README.md#examples)

## Other Implementations

FSRS is also available in other languages and ecosystems:

- [awesome-fsrs implementations](https://github.com/open-spaced-repetition/awesome-fsrs?tab=readme-ov-file#implementation)

## Contribute

For development setup, Dev Container usage, and contribution guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md).
