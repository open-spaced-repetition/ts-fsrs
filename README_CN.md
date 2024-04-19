[Introduction](./README.md) | [简体中文](./README_CN.md) ｜[はじめに](./README_JP.md)

---

# 关于

[![ts-fsrs npm version](https://img.shields.io/npm/v/ts-fsrs.svg)](https://www.npmjs.com/package/ts-fsrs)
[![codecov](https://codecov.io/gh/open-spaced-repetition/ts-fsrs/graph/badge.svg?token=E3KLLDL8QH)](https://codecov.io/gh/open-spaced-repetition/ts-fsrs)
[![Build and Publish](https://github.com/open-spaced-repetition/ts-fsrs/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/open-spaced-repetition/ts-fsrs/actions/workflows/npm-publish.yml)
[![Deploy](https://github.com/open-spaced-repetition/ts-fsrs/actions/workflows/deploy.yml/badge.svg)](https://github.com/open-spaced-repetition/ts-fsrs/actions/workflows/deploy.yml)

ts-fsrs 是一个基于TypeScript开发的[ES modules包](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c)
，用于实现[自由间隔重复调度器（FSRS）算法](https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler/blob/main/README_CN.md)
的工具。它可以帮助开发者将FSRS应用到他们的记忆卡应用中，从而提升用户的学习体验。

# 使用ts-fsrs

你需要运行在 Node.js (>=16.0.0)上，并且在`package.json`默认使用 `"type":"module"`。

```
npm install ts-fsrs
yarn install ts-fsrs
pnpm install ts-fsrs
```

# 例子

```typescript
import {createEmptyCard, formatDate, fsrs, generatorParameters, Rating, Grades} from 'ts-fsrs';

const params = generatorParameters({enable_fuzz: true});
const f = fsrs(params);
const card = createEmptyCard(new Date('2022-2-1 10:00:00'));// createEmptyCard();
const now = new Date('2022-2-2 10:00:00');// new Date();
const scheduling_cards = f.repeat(card, now);

// console.log(scheduling_cards);
Grades.forEach(grade => { // [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]
    const {log, card} = scheduling_cards[grade];
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
});
```

更多的参考:

- [参考文档- Github Pages](https://open-spaced-repetition.github.io/ts-fsrs/)
- [参考调度 - Github Pages](https://open-spaced-repetition.github.io/ts-fsrs/example)
- [浏览器使用](https://github.com/open-spaced-repetition/ts-fsrs/blob/master/example/example.html) (使用CDN来访问ts-fsrs ESM包)
- [案例应用 - 基于Next.js+Prisma](https://github.com/ishiko732/ts-fsrs-demo)
- [现代化抽成卡 - Next.js+Drizzle+tRPC](https://github.com/zsh-eng/spaced)

# 基本使用方法

## 1. **初始化**:

首先，创建一个空的卡片实例并设置当前日期（默认为当前系统时间）：

```typescript
import {Card, createEmptyCard} from "ts-fsrs";

let card: Card = createEmptyCard();
// createEmptyCard(new Date('2022-2-1 10:00:00'));
// createEmptyCard(new Date(Date.UTC(2023, 9, 18, 14, 32, 3, 370)));
// createEmptyCard(new Date('2023-09-18T14:32:03.370Z'));
```

## 2. **FSRS参数配置**:

该ts-fsrs库允许自定义SRS参数。使用`generatorParameters`来生成SRS算法的最终参数集。以下是设置最大间隔的示例：

```typescript
import {Card, createEmptyCard, generatorParameters, FSRSParameters} from "ts-fsrs";

let card: Card = createEmptyCard();
const params: FSRSParameters = generatorParameters({maximum_interval: 1000});
```

## 3. **使用FSRS进行调度**:

核心功能位于`fsrs`函数中。当调用`repeat`该函数时，它会根据不同的用户评级返回一个卡片集合的调度结果：

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
```

## 4. **检查调度卡片信息**:

一旦你有了`scheduling_cards`对象，你可以根据用户评级来获取卡片。例如，要访问一个被安排在“`Good`”评级下的卡片：

```typescript
const good: RecordLogItem = scheduling_cards[Rating.Good];
const newCard: Card = good.card;
```

当然，你可以获取每个评级下卡片的新状态和对应的历史记录：

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

## 5. **理解卡片属性**:

每个`Card`对象都包含各种属性，这些属性决定了它的状态、调度和其他指标(DS)：

```typescript
type Card = {
    due: Date;             // 卡片下次复习的日期
    stability: number;     // 记忆稳定性
    difficulty: number;    // 卡片难度
    elapsed_days: number;  // 自上次复习以来的天数
    scheduled_days: number; // 下次复习的间隔天数
    reps: number;          // 卡片被复习的总次数
    lapses: number;        // 卡片被遗忘或错误记忆的次数
    state: State;          // 卡片的当前状态（新卡片、学习中、复习中、重新学习中）
    last_review?: Date;    // 最近的复习日期（如果适用）
};
```

## 6. **理解复习记录属性**:

每个`ReviewLog`
对象都包含各种属性，这些属性决定了与之关联的卡片的复习记录信息，用于分析，回退本次复习，[优化(编写中)](https://github.com/open-spaced-repetition/fsrs-optimizer)：

```typescript
type ReviewLog = {
    rating: Rating; // 复习的评级（手动变更，重来，困难，良好，容易）
    state: State; // 复习的状态（新卡片、学习中、复习中、重新学习中）
    due: Date;  // 上次的调度日期
    stability: number; // 复习前的记忆稳定性
    difficulty: number; // 复习前的卡片难度
    elapsed_days: number; // 自上次复习以来的天数
    last_elapsed_days: number; // 上次复习的间隔天数
    scheduled_days: number; // 下次复习的间隔天数
    review: Date; // 复习的日期
}
```