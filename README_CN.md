[Introduction](./README.md) | [简体中文](./README_CN.md) ｜[はじめに](./README_JA.md)

---

# ts-fsrs

[![fsrs version](https://img.shields.io/badge/FSRS-v6-blue?style=flat-square)](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm#fsrs-6)
[![codecov](https://img.shields.io/codecov/c/github/open-spaced-repetition/ts-fsrs?token=E3KLLDL8QH&style=flat-square&logo=codecov)](https://codecov.io/gh/open-spaced-repetition/ts-fsrs)
[![Release](https://img.shields.io/github/actions/workflow/status/open-spaced-repetition/ts-fsrs/release.yml?style=flat-square&logo=githubactions&label=Release)](https://github.com/open-spaced-repetition/ts-fsrs/actions/workflows/release.yml)
[![Deploy](https://img.shields.io/github/actions/workflow/status/open-spaced-repetition/ts-fsrs/deploy.yml?style=flat-square&logo=githubpages&label=Pages)](https://github.com/open-spaced-repetition/ts-fsrs/actions/workflows/deploy.yml)

**ts-fsrs 是一个基于 FSRS 的 TypeScript 间隔重复工具集。**

## 包

这个仓库主要包含两个包：

| 包 | 说明 | FSRS 版本 | 包版本 | 下载量 |
| --- | --- | --- | --- | --- |
| [`ts-fsrs`](./packages/fsrs/README.md) | 用于构建复习调度流程的调度器 | [![fsrs version](https://img.shields.io/badge/FSRS-v6-blue?style=flat-square)](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm#fsrs-6) | [![ts-fsrs npm version](https://img.shields.io/npm/v/ts-fsrs.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/ts-fsrs) | [![ts-fsrs npm 月下载量](https://img.shields.io/npm/dm/ts-fsrs?style=flat-square)](https://www.npmjs.com/package/ts-fsrs) [![ts-fsrs npm 总下载量](https://img.shields.io/npm/dt/ts-fsrs?style=flat-square)](https://www.npmjs.com/package/ts-fsrs) |
| [`@open-spaced-repetition/binding`](./packages/binding/README.md) | 用于参数训练和 CSV 转换的高性能优化器 | [![fsrs version](https://img.shields.io/badge/FSRS-v6-blue?style=flat-square)](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm#fsrs-6) | [![binding npm version](https://img.shields.io/npm/v/@open-spaced-repetition/binding.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/@open-spaced-repetition/binding) | [![binding npm 月下载量](https://img.shields.io/npm/dm/%40open-spaced-repetition%2Fbinding?style=flat-square)](https://www.npmjs.com/package/@open-spaced-repetition/binding) [![binding npm 总下载量](https://img.shields.io/npm/dt/%40open-spaced-repetition%2Fbinding?style=flat-square)](https://www.npmjs.com/package/@open-spaced-repetition/binding) |

## 安装

当前仓库中的所有包都要求 Node.js `>=20.0.0`。

Node.js 16 和 18 已经停止维护，因此我们不再考虑支持低于 Node.js 20 的版本。详见 [Node.js 官方发布状态页面](https://nodejs.org/en/about/previous-releases#looking-for-the-latest-release-of-a-version-branch)。

```bash
pnpm add ts-fsrs
```

如果你还需要基于复习日志进行参数优化：

```bash
pnpm add @open-spaced-repetition/binding
```

## 基础用法

使用 `ts-fsrs` 进行复习调度：

```ts
import { createEmptyCard, fsrs, Rating } from 'ts-fsrs'

const scheduler = fsrs()
const card = createEmptyCard()

// 在用户作答前，预览四种评分对应的调度结果。
const preview = scheduler.repeat(card, new Date())
// 在用户作答后，应用最终评分并得到最终卡片和日志。
const result = scheduler.next(card, new Date(), Rating.Good)

console.log(preview[Rating.Good].card)
console.log(result.card)
console.log(result.log)
```

如果你要根据复习日志训练 FSRS 参数，请查看 [`packages/binding/README.md`](./packages/binding/README.md)，其中包含 CSV 转换、时区处理、浏览器/WASI 配置和训练示例。

## 更多文档

如需详细用法、高阶示例、浏览器/WASI 配置和 API 说明，请查看：

- [`packages/fsrs/README.md`](./packages/fsrs/README.md)
- [`packages/binding/README.md`](./packages/binding/README.md)
- [TypeDoc API 文档](https://open-spaced-repetition.github.io/ts-fsrs/)
- [卡片状态转换图](./ts-fsrs-workflow.drawio)

## 示例

- [`ts-fsrs` 包示例](./packages/fsrs/README.md#examples)
- [`@open-spaced-repetition/binding` 包示例](./packages/binding/README.md#examples)

## 其他语言实现

FSRS 也有其他语言和生态的实现：

- [awesome-fsrs implementations](https://github.com/open-spaced-repetition/awesome-fsrs?tab=readme-ov-file#implementation)

## 贡献

如何配置开发环境、使用Dev Container快速开发以及贡献规范请查阅 [CONTRIBUTING.md](./CONTRIBUTING.md)文档。
