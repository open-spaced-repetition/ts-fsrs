[Introduction](./README.md) | [简体中文](./README_CN.md) ｜[はじめに](./README_JA.md)

---

# About
[![fsrs version](https://img.shields.io/badge/FSRS-v6-blue?style=flat-square)](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm#fsrs-6)
[![ts-fsrs npm version](https://img.shields.io/npm/v/ts-fsrs.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/ts-fsrs)
[![Downloads](https://img.shields.io/npm/dm/ts-fsrs?style=flat-square)](https://www.npmjs.com/package/ts-fsrs)
[![codecov](https://img.shields.io/codecov/c/github/open-spaced-repetition/ts-fsrs?token=E3KLLDL8QH&style=flat-square&logo=codecov
)](https://codecov.io/gh/open-spaced-repetition/ts-fsrs)
[![Release](https://img.shields.io/github/actions/workflow/status/open-spaced-repetition/ts-fsrs/release.yml?style=flat-square&logo=githubactions&label=Release
)](https://github.com/open-spaced-repetition/ts-fsrs/actions/workflows/release.yml)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/open-spaced-repetition/ts-fsrs)

ts-fsrs is a versatile package written in TypeScript that supports [ES modules](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c), [CommonJS](https://en.wikipedia.org/wiki/CommonJS), and UMD. It implements the [Free Spaced Repetition Scheduler (FSRS) algorithm](https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler), enabling developers to integrate FSRS into their flashcard applications to enhance the user learning experience.

You can find the state transition diagram for cards here:
> - google drive: [ts-fsrs-workflow.drawio](https://drive.google.com/file/d/1FLKjpt4T3Iis02vjoA10q7vxKCWwClfR/view?usp=sharing) (You're free to leave comments)
> - github: [ts-fsrs-workflow.drawio](./ts-fsrs-workflow.drawio)

# Development

For contributors and developers who want to work on ts-fsrs itself, we provide a Dev Container setup for a consistent development environment.

📖 **[Development Quickstart Guide](./.devcontainer/QUICKSTART.md)** - Get started with VS Code Dev Containers

# Usage

## ts-fsrs (scheduler)

`ts-fsrs@3.x` requires Node.js version `16.0.0` or higher. Starting with `ts-fsrs@4.x`, the minimum required Node.js version is `18.0.0`.
From version `3.5.6` onwards, ts-fsrs supports CommonJS, ESM, and UMD module systems.

```bash
npm install ts-fsrs
yarn add ts-fsrs
pnpm install ts-fsrs
bun add ts-fsrs
```

# Example

```typescript
import {createEmptyCard, formatDate, fsrs, generatorParameters, Rating, Grades} from 'ts-fsrs';

const params = generatorParameters({ enable_fuzz: true, enable_short_term: false });
const f = fsrs(params);
const card = createEmptyCard(new Date('2022-2-1 10:00:00'));// createEmptyCard();
const now = new Date('2022-2-2 10:00:00');// new Date();
const scheduling_cards = f.repeat(card, now);

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

More resources:
- [Docs - Github Pages](https://open-spaced-repetition.github.io/ts-fsrs/)
- [Example.html - Github Pages](https://open-spaced-repetition.github.io/ts-fsrs/example)
- [Browser](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/example/example.html) (ts-fsrs package using CDN)
- [ts-fsrs-demo - Next.js+Hono.js+kysely](https://github.com/ishiko732/ts-fsrs-demo)
- [spaced - Next.js+Drizzle+tRPC](https://github.com/zsh-eng/spaced)

## @open-spaced-repetition/binding (optimizer)

> **⚠️ Beta Notice**: This package is currently in beta. The API may change at any time.

For computationally intensive tasks like parameter optimization, we provide a high-performance optimizer based on [fsrs-rs](https://github.com/open-spaced-repetition/fsrs-rs) and [napi-rs](https://napi.rs/):

- **Requirements**: Node.js >= 20.0.0
- **Use Cases**: Parameter optimization, batch processing of large datasets
- **Platform Support**: Windows, macOS, Linux (x64/arm64), Android, WebAssembly
- **⚠️ Limitations**:
  - Cannot run in edge-runtime environments (edge-runtime does not support WASI)
  - For WASM support, additional configuration is required

### Installation

**Basic Installation** (Automatic platform detection):
```bash
npm install @open-spaced-repetition/binding
pnpm install @open-spaced-repetition/binding
yarn add @open-spaced-repetition/binding
bun add @open-spaced-repetition/binding
```

**WebAssembly Installation**:

To install the WASM version, configure your package manager:

- **pnpm**: Add to `pnpm-workspace.yaml`:
  ```yaml
  supportedArchitectures:
    cpu: [current, wasm32]
  ```

- **yarn**: Requires yarn v4. Configure `supportedArchitectures` as detailed in the [NAPI-RS documentation](https://napi.rs/docs/concepts/webassembly#install-the-webassembly-package)

- **Force WASM mode**: Set the environment variable:
  ```bash
  NAPI_RS_FORCE_WASI=1
  ```

### Basic Example

See: [packages/binding/__tests__/demo/simple.ts](./packages/binding/__tests__/demo/simple.ts)

```typescript
import { computeParameters, convertCsvToFsrsItems } from '@open-spaced-repetition/binding';

// Optimize FSRS parameters from review history
const parameters = await computeParameters(fsrsItems, {
  enableShortTerm: true,
  timeout: 100,
  progress: (cur, total) => console.log(`${cur}/${total}`)
});
```

> **Note**: The binding package provides native performance for parameter optimization. For regular card scheduling, use the `ts-fsrs` package above.

# Basic Use 

## 1. **Initialization**:
To begin, create an empty card instance and set the current date (default: current time from the system):

```typescript
import { Card, createEmptyCard } from "ts-fsrs";
let card: Card = createEmptyCard();
// createEmptyCard(new Date('2022-2-1 10:00:00'));
// createEmptyCard(new Date(Date.UTC(2023, 9, 18, 14, 32, 3, 370)));
// createEmptyCard(new Date('2023-09-18T14:32:03.370Z'));
```

## 2. **Parameter Configuration**:
The library has multiple modifiable "SRS parameters" (settings, besides the weight/parameter values). Use `generatorParameters` to set these parameters for the SRS algorithm. Here's an example for setting a maximum interval:

```typescript
import { Card, createEmptyCard, generatorParameters, FSRSParameters } from "ts-fsrs";
let card: Card = createEmptyCard();
const params: FSRSParameters = generatorParameters({ maximum_interval: 1000 });
```

## 3. **Scheduling with FSRS**:
The core functionality lies in the `repeat` function of the `fsrs` class. When invoked, it returns a set of cards scheduled based on different potential user ratings:

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
// if you want to specify the grade, you can use the following code: (ts-fsrs >=4.0.0)
// let scheduling_card: RecordLog = f.next(card, new Date(), Rating.Good);
```

## 4. **Retrieving Scheduled Cards**:
Once you have the `scheduling_cards` object, you can retrieve cards based on user ratings. For instance, to access the card scheduled for a 'Good' rating:

```typescript
const good: RecordLogItem = scheduling_cards[Rating.Good];
const newCard: Card = good.card;
```

Get the new state of card for each rating:
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

## 5. **Understanding Card Attributes**:
Each `Card` object consists of various attributes that determine its status, scheduling, and other metrics:

```typescript
type Card = {
  due: Date;             // Date when the card is next due for review
  stability: number;     // A measure of how well the information is retained
  difficulty: number;    // Reflects the inherent difficulty of the card content
  elapsed_days: number;  // Days since the card was last reviewed
  scheduled_days: number;// The interval of time in days between this review and the next one
  learning_steps: number;// Keeps track of the current step during the (re)learning stages
  reps: number;          // Total number of times the card has been reviewed
  lapses: number;        // Times the card was forgotten or remembered incorrectly
  state: State;          // The current state of the card (New, Learning, Review, Relearning)
  last_review?: Date;    // The most recent review date, if applicable
};
```

## 6. **Understanding Log Attributes**:
Each `ReviewLog` object contains various attributes that represent a review that was done on a card. Used for analysis, undoing the review, and [optimization (WIP)](https://github.com/open-spaced-repetition/fsrs-rs-nodejs).

```typescript
type ReviewLog = {
    rating: Rating; // Rating of the review (Again, Hard, Good, Easy)
    state: State; // State of the review (New, Learning, Review, Relearning)
    due: Date;  // Date of the last scheduling
    stability: number; // Stability of the card before the review
    difficulty: number; // Difficulty of the card before the review
    elapsed_days: number; // Number of days elapsed since the last review
    last_elapsed_days: number; // Number of days between the last two reviews
    scheduled_days: number; // Number of days until the next review
    learning_steps: number; // Keeps track of the current step during the (re)learning stages
    review: Date; // Date of the review
}
```
