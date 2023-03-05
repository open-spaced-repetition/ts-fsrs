# About The

ts-fsrs is a TypeScript package used to implement the Free Spaced Repetition Scheduler (FSRS) algorithm. It helps
developers apply FSRS to their flashcard applications, thereby improving the user learning experience.,

# Usage

```
npm install ts-fsrs
```

# [Have trouble importing Day.js?](https://day.js.org/docs/en/installation/typescript#have-trouble-importing-dayjs)

If your `tsconfig.json` contains the following config, you must do the default import
workflow `import dayjs from 'dayjs'`:

```
//tsconfig.json
{
  "compilerOptions": {
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
  }
}
```

# Example

```typescript
import { generatorParameters, fsrs, createEmptyCard } from 'ts-fsrs';
import dayjs from 'dayjs'; // or import * as dayjs from "dayjs";


const params = generatorParameters({ enable_fuzz: true });
const f = fsrs(params);
const card = createEmptyCard();
const now = dayjs();
const scheduling_cards = f.repeat(card, now);
console.log(scheduling_cards);
```

> More examples refer to the [Example](https://github.com/ishiko732/ts-fsrs/blob/master/test/index.ts)