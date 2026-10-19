[Introduction](./README.md) | [简体中文](./README_CN.md) ｜[はじめに](./README_JA.md)

---

# ts-fsrs

[![fsrs version](https://img.shields.io/badge/FSRS-3%20%7C%204%20%7C%204.5%20%7C%205%20%7C%206%20%7C%207-blue?style=flat-square)](./docs/src/zh-CN/guide/model/index.mdx)
[![codecov](https://img.shields.io/codecov/c/github/open-spaced-repetition/ts-fsrs?token=E3KLLDL8QH&style=flat-square&logo=codecov)](https://codecov.io/gh/open-spaced-repetition/ts-fsrs)
[![Release](https://img.shields.io/github/actions/workflow/status/open-spaced-repetition/ts-fsrs/release.yml?style=flat-square&logo=githubactions&label=Release)](https://github.com/open-spaced-repetition/ts-fsrs/actions/workflows/release.yml)

**ts-fsrs 是一个基于 FSRS 的 TypeScript 间隔重复工具集。**

## 包

这个仓库主要包含两个包：

| 包 | 说明 | 支持的 FSRS 版本 | 包版本 | 下载量 |
| --- | --- | --- | --- | --- |
| [`ts-fsrs`](./packages/fsrs/README_CN.md) | 用于构建复习调度流程的调度器 | [![fsrs version](https://img.shields.io/badge/FSRS-3%20%7C%204%20%7C%204.5%20%7C%205%20%7C%206%20%7C%207-blue?style=flat-square)](./docs/src/zh-CN/guide/model/index.mdx) | [![ts-fsrs npm version](https://img.shields.io/npm/v/ts-fsrs.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/ts-fsrs) | [![ts-fsrs npm 月下载量](https://img.shields.io/npm/dm/ts-fsrs?style=flat-square)](https://www.npmjs.com/package/ts-fsrs) [![ts-fsrs npm 总下载量](https://img.shields.io/npm/dt/ts-fsrs?style=flat-square)](https://www.npmjs.com/package/ts-fsrs) |
| [`@open-spaced-repetition/binding`](./packages/binding/README_CN.md) | 用于参数训练和 CSV 转换的高性能优化器 | [![fsrs version](https://img.shields.io/badge/FSRS-6%20%7C%207-blue?style=flat-square)](./docs/src/zh-CN/guide/optimizer/index.mdx) | [![binding npm version](https://img.shields.io/npm/v/@open-spaced-repetition/binding.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/@open-spaced-repetition/binding) | [![binding npm 月下载量](https://img.shields.io/npm/dm/%40open-spaced-repetition%2Fbinding?style=flat-square)](https://www.npmjs.com/package/@open-spaced-repetition/binding) [![binding npm 总下载量](https://img.shields.io/npm/dt/%40open-spaced-repetition%2Fbinding?style=flat-square)](https://www.npmjs.com/package/@open-spaced-repetition/binding) |

## 安装

`ts-fsrs` v6 和 `@open-spaced-repetition/binding` 需要 Node.js `>=24.0.0`。

```bash
pnpm add ts-fsrs
```

如果你还需要基于复习日志进行参数优化：

```bash
pnpm add @open-spaced-repetition/binding
```

## 基础用法

使用 `DefaultScheduler()` 进行 `ts-fsrs` v6 复习调度。它默认使用 FSRS-7；库版本与 FSRS 模型版本相互独立。

```ts
import { DefaultScheduler, Rating } from 'ts-fsrs'

const now = new Date('2026-01-01T00:00:00.000Z')
const scheduler = await DefaultScheduler()
const card = scheduler.newCard({ now })

// 在用户作答前，预览四种评分对应的调度结果。
const preview = scheduler.preview({ card, now })
for (const { grade, card: previewCard, revlog } of preview) {
  console.log(grade, previewCard, revlog)
}

// 在用户作答后，应用最终评分并得到最终卡片和日志。
const result = scheduler.review({ card, grade: Rating.Good, now })

console.log(result.card)
console.log(result.revlog)
```

如果你要根据复习日志训练 FSRS 参数，请查看 [`packages/binding/README_CN.md`](./packages/binding/README_CN.md)，其中包含 CSV 转换、时区处理、浏览器/WASI 配置和训练示例。

## 更多文档

如需详细用法、高阶示例、浏览器/WASI 配置和 API 说明，请查看：

- [`packages/fsrs/README_CN.md`](./packages/fsrs/README_CN.md)
- [`packages/binding/README_CN.md`](./packages/binding/README_CN.md)
- [快速开始](./docs/src/zh-CN/guide/quick-start.mdx)
- [v5 → v6 与 FSRS-7 迁移指南](./docs/src/zh-CN/guide/migration.mdx)

## 示例

- [`ts-fsrs` 包示例](./packages/fsrs/README_CN.md#示例)
- [`@open-spaced-repetition/binding` 包示例](./packages/binding/README_CN.md#示例)

## 其他语言实现

FSRS 也有其他语言和生态的实现：

- [awesome-fsrs implementations](https://github.com/open-spaced-repetition/awesome-fsrs?tab=readme-ov-file#implementation)

## 贡献

如何配置开发环境、使用Dev Container快速开发以及贡献规范请查阅 [CONTRIBUTING.md](./CONTRIBUTING.md)文档。
