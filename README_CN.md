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

你可以通过[ts-fsrs-workflow.drawio](https://app.diagrams.net/?tags=%7B%7D&lightbox=1&highlight=0000ff&edit=_blank&layers=1&nav=1&title=ts-fsrs-workflow.drawio#R%3Cmxfile%3E%3Cdiagram%20id%3D%22aEf3h9zvOVPK_aX-VWGx%22%20name%3D%22TS-FSRS%20WorkFlow%22%3E7V1bc5s4FP4t%2B%2BCZZmec4X55TJyk3ZludyfembZPGRmErQkgr8CJ01%2B%2FEggMsoixDdjtOmkSc4SEpPOdqyQ60ifR%2BiMBy8Wf2IfhSFP89Ui%2FG2maaugG%2FcMobznF1p2cMCfI5zdtCFP0A3Kiwqkr5MOkdmOKcZiiZZ3o4TiGXlqjAULwa%2F22AIf1py7BHG4Rph4It6lfkZ8ucqqj2Rv6J4jmi%2BLJquXmJREobuYjSRbAx68Vkn4%2F0icE4zT%2FFK0nMGSTV8xLXu%2BhobTsGIFx2qbC4o%2Fv5vxj9OhbT%2FfP02%2BfPv9YgzFv5QWEKz7gkWaFtL3bANNmaa%2FTNz4V1r8rXBSMk4xRN%2FQG1VpSZt9uyumnOf%2BbNTQrCP9Mxw%2FTx2lBpz2dbe5VvmLyHIR0gjbFeReKO7RabzQ6nUv20VvN6J%2Fb1wVK4XQJPEZ7pViktEUahfRKZZ3Aq9iH%2FudZSQDe85ww6l%2BrNEQx5HQfkOe%2FaDMoZYBVrhWzTtQyqlr2qDr%2FxWRCksJ1hcT58RHiCKbkjd7CS02dw4gLh6FzrLxuoKbZnLaowMzhNMDRPS%2Bb3gCAfuAY2AMP2oB4%2BHL%2FVY6FdgCgo6FKoAXvO2BUIcOcT5a5zSfVGJJPeiOfZkcx6TMEJEbxnPXuHd7MiISrRzz2EW4evM9TW4PSaHjw%2FXp0%2FzC6nYzcGzWiN5rsl6pE5whCQ6lrC8s4NQqNRhQmSxB3qy0e4QuCrzsURv7YM%2BSV65yaV9aAmv1mDlB8jG4nubnm%2FNjBrgCF4QSHmGR19SAwXYvRk5TgZ1iUxJjZ%2BE6stlvnrWlv81ZmtM2%2BWGsPKIafAPGPEcLjODsLFKVHzlr2mXHWGVBoP2K8i7O9yayizMwg6JGztnlmnFVltlOYUW9FXsoJhbF%2Fw%2BJZFvKEIEmQV5%2FRzfQrWcSSLCpVaY%2B%2F0YsxjWdUs6B8z0IZ3dUKwt2a186v3oqrNUq%2FFU3Rz3k9k19tKrGLt2oLf0OC6GxBwok5c4swWnuPswleEQ%2FuDlRSQOYw3e0oQ78W5m%2FjpIID8x0cEBiCFL3UkwMycPAn%2FI1RJqdFHGEJLpxo7vNx81rVYF5oaMsXFBvKJ2arIQoh8Fa5bcluSJo7rGuC3Oi1JAP9kLe4EYRyTo%2BQDXM42dgDk2eCIVNkvXYghkxBJ1p2PxiyhA6b1hAY6tHffUAkoS08TFYkA4n28AWuWZPTFC7bmsuUVamhFIRoHjMI0zaZzrxl5g15ILzhBRHyfVb9lkDaSzDLmmKI5hyg7Zq3I%2FOOtbVKcT6Su0ZXuGqDO%2FShmuBZjXxciXjofZnaQnucRp0U1nNjMb9XbOk71rNSqbTWOyz14eZUb2lOjbNShYZTx5otarDWqlBIxDqiTu3KnAqho60NoArd%2FjThVhBxD5K30wURwLVgj0GE6HQ57qmDiCFZ%2B0vHh1us1czTslY7qQ9cGqAyfPxevdgRKCrXtqbXgkVFtd83ePRCjBYPN2ZGS2N2XrGhaQgpY%2BvQ2FCwiq7bjzGzRetrDGDMtOY1h0seez%2BdJ%2BaxHYmnPqzOazZnWzN%2FPLNZJeURhtsLj3WWyrj%2Ff4nlhHSVI9mfoGpDxnL6zxvLSZOv1i6TKsujHm4Z22ZNzyvMU4VlGcc40DJqWoMD37FlVIXMmqsOYBkLmbvEeceqPVVwbBzJ4v2ghlFv3u5zcXr25K24xHvqGF5vdmgvq%2Fd7sVYT13hPzlpZDH9JzxzAWl0%2FN9YOuZ2qzd7I%2F%2BtykyZkTSxrO3E36GqTPuRurLyVg9X5WYKC4JQGC5g9zH032tkDJLZVB4mxDRJ9UJDINnYNFsY2zuiZxHumEKapysGp0IKDjS11FPGJOVdVUwYI%2BYzmkO%2FiO%2B7nYAiZLlWVbK4f1MMwhjya9Us7j4ZxdryVZTEvqZpD1jBEU3F63jbnanz0ImVtMxOXBO5ZozP8oILA9rY9%2FcHcQTokSgQR43lWpFQwhHbiqiRno9qiZrPzMzmqPZgdW3ZMSAZf0Y3pDr7N6agh4NtUQ0SvztGrzDDxIRl7OWtusp6TD%2BNxlX7VySO17h7Z2jnbDLM8rlx9LopRiqhQZrdkdQMQofAtL%2F0EwxfIZCIvzzT3OMlVNyuPMYl4ZbGjgswr9Tiz7uY1nc1sFHQJdVC2KyzSiZlGeApWP35kBK7V8t9blwp6ETSfxlYAHw4b1LF9r%2F87EFFi02wmngLgpbRPmvI7%2FfkQgfVTNnBlTH8iFPOrkcY6ol5lLb4LiuHmpaNZaJhdYXg5Gk4ywkVLMesFezRQziTmiYB4Dj9k0zBhwhSCZUI9xOyCogZFq%2BgJce1xVaqPivjsqzX6FSUC0xWJ%2BaV9WwU7H1GBfPtu354f5O7scLKLV19E6zl76cr1DCTIu%2Faxt4oyV6R0jkIYbNo%2FzFEpEyfqtmeiy7Z%2BqP2dNm9eTmkUfEyWCxAnOTby3JfCnMkxn6KbrBYgaaUI0XCHTRQrUwqDQ4edvUtGbMeHHiZZvnKcLpD3HMMkkRhn8V7e0533NRr7EIO0MOPcG1V8lCxD8Fbcnr3VRFN%2BQ9ESkxTEacVPaPNOBhyGzO1gvVqwhiiOXxBeJRXFuJECwo%2FnK3gJ875fN4uKVHjaZKr7P7ivKopxbdadctnbPgaNKYuGT7vraa%2Fzn5INvfJNxZUjLvvsgRISDT6ATuCNxOCNllieA2fBe%2BDYuWvKbHs6xuRsOZM8OsWyKmC52Im0dyZdJhc9nRdUlcKEFPtv6gcGJRXsYyvYA2TrC3T0kfWbpiDNNDMOZPraq%2Bfu271Yi9XZO1Fvsm%2Fe8Qo9%2F5LKZ%2FbVjfJ2bBHvtiLR3YoucVt6W%2Bsze9y8lb8Uh7new7HYN6HjGzJWOtpM746VgoTKjPCwjLRkVrgjRgYJSa5J6XGJbtIHwhk9ybjMohIvP3z8Gc%2Bv2rK9OYvKA4WfMoe6rcwlZ7c0WajSm79m9bh29yXzsqvSLvWmO5T%2FHqSZehOnF2eZOR7Oqe7RGQ4cD3pSZ3jmmIZ58DtdOj2k19qpts5rc4rrin6we%2BhxBNfZdqnNnlxqQ%2Bjzvh5ycYiwVw%2FZanaVLhme1hme3paGqbdJNT4bA2bYYz0rjdF1o%2B05swRPeRq2NEUSz7LYvTWQu9DjmdbMsQxwpmN3upUxe%2F3yhDp7kMZuq2yKAxAmcKcQ7l6eFPt11QiMiy8r0dM1cMr2M%2FcHzuas%2B2U%2Fy%2BjABZ5fdT%2BLKhyck7xlsavtLPRy8%2B783AHZ%2FA8E%2Bv1%2F%3C%2Fdiagram%3E%3C%2Fmxfile%3E)来获取ts-fsrs的工作流信息。

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