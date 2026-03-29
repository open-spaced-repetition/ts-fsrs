# ts-fsrs

[![fsrs version](https://img.shields.io/badge/FSRS-v6-blue?style=flat-square)](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm#fsrs-6)
[![npm version](https://img.shields.io/npm/v/ts-fsrs.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/ts-fsrs)
[![downloads](https://img.shields.io/npm/dm/ts-fsrs?style=flat-square)](https://www.npmjs.com/package/ts-fsrs)

[Introduction](./README.md) | [简体中文](./README_CN.md) | [はじめに](./README_JA.md)

**ts-fsrs is a TypeScript package that helps developers build their own spaced repetition system using the Free Spaced Repetition Scheduler algorithm.**

## Table of Contents

- [ts-fsrs](#ts-fsrs)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Quickstart](#quickstart)
  - [Usage](#usage)
    - [Custom parameters](#custom-parameters)
    - [`generatorParameters`](#generatorparameters)
    - [`repeat` vs `next`](#repeat-vs-next)
    - [Retrievability](#retrievability)
    - [`next_state` and `next_interval`](#next_state-and-next_interval)
    - [History helpers](#history-helpers)
  - [Reference](#reference)
  - [API Documentation](#api-documentation)
  - [Examples](#examples)
  - [Contributing](#contributing)

## Installation

`ts-fsrs` requires Node.js `>=20.0.0`.

```bash
npm install ts-fsrs
yarn add ts-fsrs
pnpm install ts-fsrs
bun add ts-fsrs
```

## Quickstart

Import and initialize the scheduler:

```ts
import { createEmptyCard, fsrs, Rating } from 'ts-fsrs'

const scheduler = fsrs()
```

Create a new card:

```ts
const card = createEmptyCard()
```

Preview all possible scheduling outcomes:

```ts
const preview = scheduler.repeat(card, new Date())

console.log(preview[Rating.Again].card)
console.log(preview[Rating.Hard].card)
console.log(preview[Rating.Good].card)
console.log(preview[Rating.Easy].card)
```

Apply a specific rating:

```ts
const result = scheduler.next(card, new Date(), Rating.Good)

console.log(result.card)
console.log(result.log)
```

## Usage

### Custom parameters

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

`request_retention` Is the percentage (`0.0-1.0`) that the scheduler will try and have you get correct. Higher values increase review load, lower values reduce it.

`maximum_interval` caps how far into the future a card can be scheduled.

`enable_fuzz` adds a small amount of randomness to long intervals.

`enable_short_term`, `learning_steps`, and `relearning_steps` control short-term and relearning step behavior.

### `generatorParameters`

`fsrs()` already applies `generatorParameters()` internally, so in normal scheduler setup you can pass a partial parameter object directly to `fsrs()`.

Use `generatorParameters()` when you need a complete `FSRSParameters` object for serialization, persistence, or reuse:

```ts
import { fsrs, generatorParameters } from 'ts-fsrs'

const params = generatorParameters({
  request_retention: 0.9,
  maximum_interval: 36500,
})

console.log(JSON.stringify(params))

const scheduler = fsrs(params)
```

If you persist those parameters and load them later, pass the parsed object back into `fsrs()`:

```ts
import { fsrs, type FSRSParameters } from 'ts-fsrs'

const serializedParams = '{"request_retention":0.9,"maximum_interval":36500}'
const params = JSON.parse(serializedParams) as FSRSParameters
const scheduler = fsrs(params)
```

If the parameters come from external storage, user input, or the network, validate them at your application boundary before passing them to `fsrs()`. A runtime schema library such as `zod` is a good fit for that.

### `repeat` vs `next`

Use `repeat` when you want to preview all four outcomes before the user answers.

```ts
const preview = scheduler.repeat(card, new Date())
```

Use `next` when you already know the selected rating.

```ts
const result = scheduler.next(card, new Date(), Rating.Good)
```

If you want to map the result into your own storage type, pass an `afterHandler`.

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

### Retrievability

```ts
const retrievability = scheduler.get_retrievability(result.card, new Date(), false)
console.log(retrievability)
```

You can also calculate retrievability directly with `forgetting_curve()` if you already have `elapsed_days`, `stability`, and a valid decay value:

```ts
import { forgetting_curve } from 'ts-fsrs'

const retrievability = forgetting_curve(0.5, 12, result.card.stability)
console.log(retrievability)
```

When you pass a decay value directly, it must be positive and within the range `0.1` to `0.8`.

### `next_state` and `next_interval`

If you are working directly with memory states, you can combine `next_state()` and `next_interval()`:

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

This is useful for simulations, analytics, or custom scheduling pipelines. For standard review flows, prefer `repeat()` or `next()`.

### History helpers

The scheduler also provides:

- `rollback(card, log)`
- `forget(card, now, reset_count?)`
- `reschedule(card, reviews, options?)`

These are useful when replaying imported review logs or rebuilding state from persistence.

## Reference

Card states:

```ts
State.New
State.Learning
State.Review
State.Relearning
```

Review ratings:

```ts
Rating.Again
Rating.Hard
Rating.Good
Rating.Easy
```

## API Documentation

- Repository overview: [github.com/open-spaced-repetition/ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs#readme)
- TypeDoc API docs: [open-spaced-repetition.github.io/ts-fsrs](https://open-spaced-repetition.github.io/ts-fsrs/)
- Optimizer package: [`@open-spaced-repetition/binding`](https://www.npmjs.com/package/@open-spaced-repetition/binding)
- Simplified Chinese README: [README_CN.md](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/README_CN.md)
- Japanese README: [README_JA.md](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/README_JA.md)

## Examples

- Browser example: [example/example.html](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/example/example.html)
- Full-stack demo: [ts-fsrs-demo](https://github.com/ishiko732/ts-fsrs-demo)
- Other:
  - [spaced](https://github.com/zsh-eng/spaced)
  - [Anki Search Stats Extended](https://github.com/Luc-Mcgrady/Anki-Search-Stats-Extended)

## Contributing

Contribution guidelines are available in [`CONTRIBUTING.md`](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/CONTRIBUTING.md).
