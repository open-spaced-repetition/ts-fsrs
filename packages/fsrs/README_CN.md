# ts-fsrs

[Introduction](./README.md) | [简体中文](./README_CN.md) | [はじめに](./README_JA.md)

[![fsrs version](https://img.shields.io/badge/FSRS-v6-blue?style=flat-square)](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm#fsrs-6)
[![npm version](https://img.shields.io/npm/v/ts-fsrs.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/ts-fsrs)
[![downloads](https://img.shields.io/npm/dm/ts-fsrs?style=flat-square)](https://www.npmjs.com/package/ts-fsrs)

**ts-fsrs 是一个 TypeScript 包，帮助开发者基于自由间隔重复调度器（FSRS）算法构建自己的间隔重复系统。**

## 目录

- [安装](#安装)
- [快速开始](#快速开始)
- [使用说明](#使用说明)
- [参考](#参考)
- [API 文档](#api-文档)
- [示例](#示例)
- [贡献](#贡献)

## 安装

`ts-fsrs` 需要 Node.js `>=20.0.0`。

```bash
npm install ts-fsrs
yarn add ts-fsrs
pnpm install ts-fsrs
bun add ts-fsrs
```

## 快速开始

导入并初始化调度器：

```ts
import { createEmptyCard, fsrs, Rating } from 'ts-fsrs'

const scheduler = fsrs()
```

创建一张新卡片：

```ts
const card = createEmptyCard()
```

预览四种评分下的全部调度结果：

```ts
const preview = scheduler.repeat(card, new Date())

console.log(preview[Rating.Again].card)
console.log(preview[Rating.Hard].card)
console.log(preview[Rating.Good].card)
console.log(preview[Rating.Easy].card)
```

如果用户已经作答，可以直接应用一个确定评分：

```ts
const result = scheduler.next(card, new Date(), Rating.Good)

console.log(result.card)
console.log(result.log)
```

## 使用说明

### 自定义参数

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

`request_retention` 调度器希望维持的最低记忆保持率（0%到100%）。值越高，复习越频繁；值越低，复习越少。

`maximum_interval` 用于限制卡片最多可以被安排到未来多少天。

`enable_fuzz` 会给较长的间隔增加少量随机扰动，避免大量卡片在同一天到期。

`enable_short_term`、`learning_steps` 和 `relearning_steps` 用于控制短期学习和重新学习步骤。

### `generatorParameters`

`fsrs()` 内部已经会调用 `generatorParameters()` 来补齐和规范化参数，所以普通初始化调度器时，直接把部分参数对象传给 `fsrs()` 即可。

当你需要一个完整的 `FSRSParameters` 对象用于序列化、持久化或复用时，再使用 `generatorParameters()`：

```ts
import { fsrs, generatorParameters } from 'ts-fsrs'

const params = generatorParameters({
  request_retention: 0.9,
  maximum_interval: 36500,
})

console.log(JSON.stringify(params))

const scheduler = fsrs(params)
```

如果你把参数持久化之后再加载回来，也可以把解析后的对象直接传回 `fsrs()`：

```ts
import { fsrs, type FSRSParameters } from 'ts-fsrs'

const serializedParams = '{"request_retention":0.9,"maximum_interval":36500}'
const params = JSON.parse(serializedParams) as FSRSParameters
const scheduler = fsrs(params)
```

如果这些参数来自外部存储、用户输入或网络，建议在应用边界先做运行时校验，再传给 `fsrs()`。像 `zod` 这样的运行时 schema 校验库就很适合这个场景。

### `repeat` 与 `next`

如果你需要在用户作答前预览四种评分结果，使用 `repeat`：

```ts
const preview = scheduler.repeat(card, new Date())
```

如果你已经拿到了用户的评分，直接使用 `next`：

```ts
const result = scheduler.next(card, new Date(), Rating.Good)
```

如果你想把结果直接映射成自己的存储结构，可以传入 `afterHandler`：

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

### 可提取率

```ts
const retrievability = scheduler.get_retrievability(result.card, new Date(), false)
console.log(retrievability)
```

如果你已经有 `elapsed_days`、`stability` 和合法的 decay 值，也可以直接用 `forgetting_curve()` 来计算可提取率：

```ts
import { forgetting_curve } from 'ts-fsrs'

const retrievability = forgetting_curve(0.5, 12, result.card.stability)
console.log(retrievability)
```

如果你直接传入 decay，它必须是正数，并且范围在 `0.1` 到 `0.8` 之间。

### `next_state` 与 `next_interval`

如果你直接基于记忆状态做推导，可以把 `next_state()` 和 `next_interval()` 组合使用：

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

这种写法适合做模拟、分析，或者你自己维护 `{ stability, difficulty }` 的自定义调度流程。对于普通复习流程，优先使用 `repeat()` 或 `next()`。

### 历史辅助能力

调度器还提供这些辅助方法：

- `rollback(card, log)`
- `forget(card, now, reset_count?)`
- `reschedule(card, reviews, options?)`

它们适合导入旧数据、回放历史复习记录，或从持久化日志重建卡片状态。

## 参考

卡片状态：

```ts
State.New
State.Learning
State.Review
State.Relearning
```

评分枚举：

```ts
Rating.Again
Rating.Hard
Rating.Good
Rating.Easy
```

## API 文档

- 仓库主页：[github.com/open-spaced-repetition/ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs#readme)
- TypeDoc API 文档：[open-spaced-repetition.github.io/ts-fsrs](https://open-spaced-repetition.github.io/ts-fsrs/)
- 优化器包：[`@open-spaced-repetition/binding`](https://www.npmjs.com/package/@open-spaced-repetition/binding)

## 示例

- 浏览器示例：[example/example.html](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/example/example.html)
- 完整示例项目：[ts-fsrs-demo](https://github.com/ishiko732/ts-fsrs-demo)
- 其他：
  - [spaced](https://github.com/zsh-eng/spaced)
  - [Anki Search Stats Extended](https://github.com/Luc-Mcgrady/Anki-Search-Stats-Extended)

## 贡献

贡献说明见 [`CONTRIBUTING.md`](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/CONTRIBUTING.md)。
