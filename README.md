# About The

ts-fsrs is a TypeScript package used to implement the [Free Spaced Repetition Scheduler (FSRS) algorithm](https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler). It helps
developers apply FSRS to their flashcard applications, there by improving the user learning experience.

# Usage

```
npm install ts-fsrs
```

# Environment Variables
If you need to customize default parameters, you can modify the values using `.env`/`.env.local`/`.env.production`/`.env.development`.

Copy the [.env.local.example](./example/.env.local.example) file in this directory to .env.local (which will be ignored by Git):

```bash
cp .env.local.example .env.local
```

# Example

```typescript
import {createEmptyCard, formatDate, fsrs, generatorParameters, Rating} from 'ts-fsrs';

const params = generatorParameters({ enable_fuzz: true });
const f = fsrs(params);
const card = createEmptyCard(new Date('2022-2-1 10:00:00'));// createEmptyCard();
const now = new Date('2022-2-2 10:00:00');// new Date();
const scheduling_cards = f.repeat(card, now);

// console.log(scheduling_cards);
Object.keys(Rating).filter(key => typeof Rating[key as any] === 'number').forEach(key => {
  // @ts-ignore
  const { log, card } = scheduling_cards[Rating[key]];
  console.group(`${key}`);
  console.table({
    [`card_${key}`]: {
      ...card,
      due: formatDate(card.due),
      last_review: formatDate(card.last_review),
    },
  });
  console.table({
    [`log_${key}`]: {
      ...log,
      review: formatDate(log.review),
    },
  });
  console.groupEnd();
  console.log('----------------------------------------------------------------');
});
```

> More examples refer to the [Example](https://github.com/ishiko732/ts-fsrs/blob/master/example/index.ts)