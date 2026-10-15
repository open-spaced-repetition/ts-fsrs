# ts-fsrs

[![支持的 FSRS 版本](https://img.shields.io/badge/FSRS-3%20%7C%204%20%7C%204.5%20%7C%205%20%7C%206%20%7C%207-blue?style=flat-square)](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/docs/src/zh-CN/guide/model/index.mdx)
[![npm version](https://img.shields.io/npm/v/ts-fsrs.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/ts-fsrs)
[![downloads](https://img.shields.io/npm/dm/ts-fsrs?style=flat-square)](https://www.npmjs.com/package/ts-fsrs)

[Introduction](./README.md) | [简体中文](./README_CN.md) | [はじめに](./README_JA.md)

**ts-fsrs 是一个 TypeScript 包，帮助开发者基于自由间隔重复调度器（FSRS）算法构建间隔重复系统。**

ts-fsrs v6 支持 FSRS-3、FSRS-4、FSRS-4.5、FSRS-5、FSRS-6 和 FSRS-7。库版本与 FSRS 模型版本相互独立。

## 目录

- [安装](#安装)
- [快速开始](#快速开始)
- [配置](#配置)
- [可提取率（Retrievability）](#可提取率retrievability)
- [nextInterval](#nextinterval)
- [使用 defineScheduler 组合调度器](#使用-definescheduler-组合调度器)
- [文档](#文档)
- [示例](#示例)
- [贡献](#贡献)

## 安装

`ts-fsrs` 需要 Node.js `>=24.0.0`。

```bash
npm install ts-fsrs
yarn add ts-fsrs
pnpm install ts-fsrs
bun add ts-fsrs
```

## 快速开始

在支持顶层 `await` 的 ES 模块中运行：

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

`preview()` 返回 Again、Hard、Good、Easy 四种评分的可迭代结果。`review()` 返回新的卡片和复习日志，不会修改输入卡片。应用中应保存 `result.card` 和 `result.revlog`。

`DefaultScheduler()` 在省略 `version` 时使用 FSRS-7，并包含目标保留率、统计、学习步骤、最大间隔、单调间隔和已调度天数等标准策略；模糊可通过选项启用。

## 配置

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

`desiredRetention` 设置目标保留率，值越高，复习负担越大。`maximumInterval` 限制最大间隔，单位为天。`enableShortTerm`、`learningSteps` 和 `relearningSteps` 控制显式学习步骤。`enableFuzz` 为较长间隔增加随机扰动。省略 `weights` 即使用所选模型版本的预设权重。

## 可提取率（Retrievability）

使用 `scheduler.model.forgettingCurve(memoryState, elapsedDays)` 估算回忆概率。应传入完整的模型记忆状态；FSRS-7 需要 `stability`、`stabilityFast` 和 `difficulty`。此例中的卡片状态记录于 `reviewedAt`，通过调度器的 chrono 计算到 `checkedAt` 时经过的天数。

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

返回值是 0 到 1 之间的数值。FSRS-7 保留小数天，因此此例查询的是复习后 1.5 天的回忆概率。

## nextInterval

`scheduler.model.nextInterval(memoryState, desiredRetention)` 返回模型的基础间隔。需要将已组合的间隔策略应用于已计算好的评分后状态时，使用 `scheduler.nextInterval(memoryState, desiredRetention, context)`。

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

此例关闭 `allowModelOverride`，让配置的学习步骤体现在策略间隔中。两种间隔的单位均为天。context 传入复习前的卡片、所选评分，以及该次复习经过的天数；第一个参数是评分后的记忆状态。此例创建新卡后立即复习，因此 `elapsedDays` 为 `0`。调度器查询只运行 `nextInterval` middleware，不会推进卡片或生成复习日志；最终卡片和日志仍通过 `review()` 获取。

## 使用 defineScheduler 组合调度器

`defineScheduler({ model, chrono })` 创建可复用的 definition。模型负责记忆状态和间隔计算，chrono 负责时间表示与运算。通过 `.use(...)` 添加调度策略，再调用 `.create({ config })` 校验用户或集合的配置并创建独立调度器。`DefaultScheduler()` 是使用同一组合 API 构建的现成预设。

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

将组合好的 definition 保留为程序级预设，再按不同配置创建调度器。此示例只添加目标保留率策略；需要学习步骤、统计、模糊或间隔限制时，应显式添加相应 middleware。高级调度与历史操作参阅下方指南。

## 文档

- [快速开始](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/docs/src/zh-CN/guide/quick-start.mdx)
- [调度器与时间系统](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/docs/src/zh-CN/guide/scheduler/index.mdx)
- [模型](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/docs/src/zh-CN/guide/model/index.mdx)
- [Middleware](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/docs/src/zh-CN/guide/middleware/index.mdx)
- [v5 → v6 与 FSRS-7 迁移](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/docs/src/zh-CN/guide/migration.mdx)
- [优化器指南](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/docs/src/zh-CN/guide/optimizer/index.mdx)：训练参数或转换复习日志 CSV 时，额外安装 [`@open-spaced-repetition/binding`](https://www.npmjs.com/package/@open-spaced-repetition/binding)。

## 示例

- 完整示例项目：[ts-fsrs-demo](https://github.com/ishiko732/ts-fsrs-demo)
- 其他：
  - [spaced](https://github.com/zsh-eng/spaced)
  - [Anki Search Stats Extended](https://github.com/Luc-Mcgrady/Anki-Search-Stats-Extended)

## 贡献

贡献说明见 [`CONTRIBUTING.md`](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/CONTRIBUTING.md)。
