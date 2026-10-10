# ts-fsrs

[![Supported FSRS versions](https://img.shields.io/badge/FSRS-3%20%7C%204%20%7C%204.5%20%7C%205%20%7C%206%20%7C%207-blue?style=flat-square)](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/docs/src/en-US/guide/model/index.mdx)
[![npm version](https://img.shields.io/npm/v/ts-fsrs.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/ts-fsrs)
[![downloads](https://img.shields.io/npm/dm/ts-fsrs?style=flat-square)](https://www.npmjs.com/package/ts-fsrs)

[Introduction](./README.md) | [简体中文](./README_CN.md) | [はじめに](./README_JA.md)

**ts-fsrs is a TypeScript package for building spaced repetition systems with the Free Spaced Repetition Scheduler (FSRS) algorithm.**

ts-fsrs v6 supports FSRS-3, FSRS-4, FSRS-4.5, FSRS-5, FSRS-6, and FSRS-7. The library version and FSRS model version are independent.

## Table of Contents

- [Installation](#installation)
- [Quickstart](#quickstart)
- [Configuration](#configuration)
- [Retrievability](#retrievability)
- [nextInterval](#nextinterval)
- [Compose a scheduler with defineScheduler](#compose-a-scheduler-with-definescheduler)
- [Documentation](#documentation)
- [Examples](#examples)
- [Contributing](#contributing)

## Installation

`ts-fsrs` requires Node.js `>=24.0.0`.

```bash
npm install ts-fsrs
yarn add ts-fsrs
pnpm install ts-fsrs
bun add ts-fsrs
```

## Quickstart

Run this example in an ES module with top-level `await`:

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

`preview()` returns iterable results for Again, Hard, Good, and Easy. `review()` returns a new card and review log without mutating the input card. Persist both `result.card` and `result.revlog` in your application.

`DefaultScheduler()` uses FSRS-7 when `version` is omitted and includes standard retention, statistics, learning-step, maximum-interval, monotonic-interval, and scheduled-days policies. Fuzzing is optional.

## Configuration

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

`desiredRetention` sets the target retention; higher values increase review load. `maximumInterval` caps intervals in days. `enableShortTerm`, `learningSteps`, and `relearningSteps` control explicit learning steps. `enableFuzz` adds randomness to longer intervals. Omit `weights` to use the preset for the selected model version.

## Retrievability

Use `scheduler.model.forgettingCurve(memoryState, elapsedDays)` to estimate recall probability. Pass the complete model state; FSRS-7 needs `stability`, `stabilityFast`, and `difficulty`. Here the card state was recorded at `reviewedAt`, and the scheduler chrono calculates the elapsed days at `checkedAt`.

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

The result is a number from 0 to 1. FSRS-7 keeps fractional elapsed days, so this example queries the probability 1.5 days after the review.

## nextInterval

`scheduler.model.nextInterval(memoryState, desiredRetention)` returns the model's base interval. Use `scheduler.nextInterval(memoryState, desiredRetention, context)` to apply the composed interval policies to an already computed post-rating state.

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

This example disables `allowModelOverride` so the configured learning step remains visible in the policy interval. Both intervals are in days. The context contains the pre-review card, selected grade, and elapsed days for that review; the first argument is the post-rating memory state. This example reviews a new card immediately, so `elapsedDays` is `0`. The scheduler query runs `nextInterval` middleware without advancing the card or generating a review log. Use `review()` for the final card and revlog.

## Compose a scheduler with defineScheduler

`defineScheduler({ model, chrono })` creates a reusable definition. The model supplies memory-state and interval calculations; the chrono supplies time representation and arithmetic. Add scheduling policies with `.use(...)`, then call `.create({ config })` to validate a user's or collection's configuration and create an independent scheduler. `DefaultScheduler()` is a ready-made preset built with the same composition API.

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

Keep the composed definition as a program-level preset and reuse it to create schedulers for different configurations. This example adds only the retention policy; add learning steps, statistics, fuzzing, or interval limits explicitly when you need them. See the guides below for advanced scheduling and history operations.

## Documentation

- [Quick start](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/docs/src/en-US/guide/quick-start.mdx)
- [Schedulers and chronology](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/docs/src/en-US/guide/scheduler/index.mdx)
- [Models](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/docs/src/en-US/guide/model/index.mdx)
- [Middleware](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/docs/src/en-US/guide/middleware/index.mdx)
- [v5 → v6 and FSRS-7 migration](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/docs/src/en-US/guide/migration.mdx)
- [Optimizer guide](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/docs/src/en-US/guide/optimizer/index.mdx): install [`@open-spaced-repetition/binding`](https://www.npmjs.com/package/@open-spaced-repetition/binding) separately for parameter training or review-log CSV conversion.

## Examples

- Full-stack demo: [ts-fsrs-demo](https://github.com/ishiko732/ts-fsrs-demo)
- Other:
  - [spaced](https://github.com/zsh-eng/spaced)
  - [Anki Search Stats Extended](https://github.com/Luc-Mcgrady/Anki-Search-Stats-Extended)

## Contributing

Contribution guidelines are available in [`CONTRIBUTING.md`](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/CONTRIBUTING.md).
