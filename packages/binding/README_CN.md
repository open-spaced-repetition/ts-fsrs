# @open-spaced-repetition/binding

[Introduction](./README.md) | [简体中文](./README_CN.md) | [はじめに](./README_JA.md)

[![npm version](https://img.shields.io/npm/v/@open-spaced-repetition/binding.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/@open-spaced-repetition/binding)
[![monthly downloads](https://img.shields.io/npm/dm/%40open-spaced-repetition%2Fbinding?style=flat-square)](https://www.npmjs.com/package/@open-spaced-repetition/binding)
[![total downloads](https://img.shields.io/npm/dt/%40open-spaced-repetition%2Fbinding?style=flat-square)](https://www.npmjs.com/package/@open-spaced-repetition/binding)

`@open-spaced-repetition/binding` 是一个基于 `fsrs-rs` 与 `napi-rs` 的高性能 FSRS 工具包。

适用场景：

- 根据复习历史优化参数
- 将 CSV 转换为 FSRS 训练数据
- 推荐学习步骤和重新学习步骤
- 在 Node.js 或自定义浏览器流水线中使用 WASI

> **Beta 提示**：该包仍在公开测试中，API 未来可能发生变化。

## 要求

- Node.js `>=20`

## 安装

```bash
npm install @open-spaced-repetition/binding
pnpm install @open-spaced-repetition/binding
yarn add @open-spaced-repetition/binding
bun add @open-spaced-repetition/binding
```

## 优化参数

```ts
import { readFileSync } from 'node:fs'
import {
  computeParameters,
  convertCsvToFsrsItems,
} from '@open-spaced-repetition/binding'

const timeZoneFormatterCache = new Map<string, Intl.DateTimeFormat>()

const getTimeZoneFormatter = (timeZone: string) => {
  let formatter = timeZoneFormatterCache.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('ia', {
      timeZone,
      timeZoneName: 'shortOffset',
    })
    timeZoneFormatterCache.set(timeZone, formatter)
  }
  return formatter
}

const getTimezoneOffset = (timeZone: string, date: Date | number) => {
  const timeZoneName = getTimeZoneFormatter(timeZone)
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value

  if (!timeZoneName || timeZoneName === 'GMT' || timeZoneName === 'UTC') {
    return 0
  }

  const [, sign, hours, minutes = '0'] =
    timeZoneName.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/) ?? []

  if (!sign || !hours) {
    throw new Error(`Unsupported time zone offset: ${timeZoneName}`)
  }

  const totalMinutes = Number(hours) * 60 + Number(minutes)
  return sign === '+' ? totalMinutes : -totalMinutes
}

// 反复创建 Intl.DateTimeFormat 会有明显性能开销，建议把 formatter 提取出来或做缓存。

const csvBuffer = readFileSync('./revlog.csv')
const items = convertCsvToFsrsItems(
  csvBuffer,
  4,
  'Asia/Shanghai',
  (ms, timeZone) => getTimezoneOffset(timeZone, ms)
)

const parameters = await computeParameters(items, {
  enableShortTerm: true,
  numRelearningSteps: 1,
  timeout: 500,
  progress: (current, total) => {
    console.log(`${current}/${total}`)
  },
})

console.log(parameters)
```

## 推荐学习步骤

```ts
import { readFileSync } from 'node:fs'
import { computeOptimalSteps } from '@open-spaced-repetition/binding'

const csvBuffer = readFileSync('./revlog.csv')
const stepStats = computeOptimalSteps(csvBuffer, 0.9, 0.5)

console.log(stepStats.recommendedLearningSteps)
console.log(stepStats.recommendedRelearningSteps)
```

第三个参数可以是：

- `0.1` 到 `0.8` 之间的 decay 值
- 完整的 FSRS 参数数组

由于技术限制，至多只能推荐两个初学间隔和一个重学间隔，这并不意味着你一定需要这么多间隔，也不意味着它们总是足够的。在某些数据量不足或数据不适合的情况下，也可能不会推荐任何步骤。

如果你已经在 FSRS 中使用更多的间隔，请在修改间隔数量时保持谨慎。减少间隔可能会导致保留率显著下降，而 FSRS 也可能需要较长时间来适应新的间隔配置。

## 动态初始化 WASI

使用这套方式前，需要手动安装 WASI 资源包：

```bash
pnpm add @open-spaced-repetition/binding-wasm32-wasi
```

在 Vite 中，可以通过 `?url` 导入 WASM 资源，通过 `?worker` 导入 worker，然后使用动态入口初始化优化器：

```ts
import { initOptimizer } from '@open-spaced-repetition/binding/dynamic-wasi'
import wasmUrl from '@open-spaced-repetition/binding-wasm32-wasi/fsrs-binding.wasm32-wasi.wasm?url'
import WasiWorker from '@open-spaced-repetition/binding-wasm32-wasi/wasi-worker-browser.mjs?worker'

const binding = await initOptimizer({
  wasm: wasmUrl,
  worker: () => new WasiWorker(),
})

const item = new binding.FSRSBindingItem([
  new binding.FSRSBindingReview(3, 0),
  new binding.FSRSBindingReview(4, 1),
])

const parameters = await binding.computeParameters([item], {
  enableShortTerm: true,
  numRelearningSteps: 1,
})

console.log(parameters)
```

如果你要在浏览器中部署这套方案，建议开启 cross-origin isolation，避免 worker 和 WASM 资源加载时出现跨域隔离问题。通常需要在页面响应头里同时设置：

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

使用动态 WASI 在浏览器中训练参数的示例插件：

- [FSRS Parameter Optimizer（Chrome Web Store）](https://chromewebstore.google.com/detail/fsrs-parameter-optimizer/hkbooedgcdmlhjgbljkgmdmfggklkmji)

## 不使用动态加载的 WASI

如果你不需要动态加载 WASI，也可以通过 pnpm 的 `supportedArchitectures` 让对应的 WASI 包自动安装：

```json
{
  "pnpm": {
    "supportedArchitectures": {
      "cpu": ["current", "wasm32"]
    }
  }
}
```

使用这种方式时，需要确保你的框架不会在预打包或摇树时把 `@open-spaced-repetition/binding` 连同 WASM 资源一起错误排除掉。

例如：

- 在 Next.js 中，把 `@open-spaced-repetition/binding` 加到 `serverExternalPackages`
- 在 Vite 中，把 `@open-spaced-repetition/binding` 加到 `optimizeDeps.exclude`

```ts
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  optimizeDeps: {
    exclude: ['@open-spaced-repetition/binding'],
  },
})
```

## 说明

- **默认的 WASI 路径不支持 edge runtime。**
- 在浏览器中使用时，建议显式打包 WASM 和 worker 资源。
- 在浏览器中，建议设置 `Cross-Origin-Opener-Policy: same-origin` 和 `Cross-Origin-Embedder-Policy: require-corp`，避免 worker 和 WASM 资源因为跨域隔离问题而加载失败。
- 上面的 Vite 示例需要显式安装 `@open-spaced-repetition/binding-wasm32-wasi`。
- 如果你依赖 pnpm 的 `supportedArchitectures` 而不是动态加载，记得在需要时排除 `@open-spaced-repetition/binding` 的框架优化，避免 WASM 资源被错误移除。
- 如果你只需要调度功能，请使用 [`ts-fsrs`](https://www.npmjs.com/package/ts-fsrs)。

## 示例

- 训练脚本：[packages/binding-test/src/examples/simple.ts](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/binding-test/src/examples/simple.ts)
- Next.js 训练示例：[examples/nextjs](https://github.com/open-spaced-repetition/ts-fsrs/tree/main/examples/nextjs)

## 文档

- 仓库主页：[github.com/open-spaced-repetition/ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs#readme)
- 调度器包：[`ts-fsrs`](https://www.npmjs.com/package/ts-fsrs)
- 贡献指南：[CONTRIBUTING.md](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/CONTRIBUTING.md)
