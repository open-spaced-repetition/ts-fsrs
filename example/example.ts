// noinspection UnnecessaryLocalVariableJS,DuplicatedCode

import {Card, createEmptyCard, fsrs, FSRSParameters, generatorParameters, Rating, ReviewLog} from "ts-fsrs";

interface example {
    card: Card;
    log: ReviewLog;
}

const generatorExample1 = (fsrsParameter?: FSRSParameters): example[] => {
    // new -> again -> hard -> good -> easy -> easy
    const params = generatorParameters(fsrsParameter);
    const f = fsrs(params);
    let card = createEmptyCard()
    let now = new Date("2023-10-10 10:00:00");
    let scheduling_cards = f.repeat(card, now)
    const again = scheduling_cards[Rating.Again];

    card = again.card;
    now = card.due;
    scheduling_cards = f.repeat(card, now);
    const hard = scheduling_cards[Rating.Hard]
    card = hard.card;
    now = card.due;
    scheduling_cards = f.repeat(card, now);
    const good = scheduling_cards[Rating.Good]

    card = good.card;
    now = card.due;
    scheduling_cards = f.repeat(card, now);
    const easy1 = scheduling_cards[Rating.Easy]

    card = easy1.card;
    now = card.due;
    scheduling_cards = f.repeat(card, now);
    const easy2 = scheduling_cards[Rating.Easy]

    const data = [again, hard, good, easy1, easy2]
    // data.forEach(item=> print_scheduling_card(item))
    return data;
}


const generatorExample2 = (fsrsParameter?: FSRSParameters): example[] => {
    // new -> hard -> good->again->easy->easy->good->hard->hard
    const params = generatorParameters(fsrsParameter);
    const f = fsrs(params);
    let card = createEmptyCard()
    let now = new Date("2023-10-10 10:00:00");
    let scheduling_cards = f.repeat(card, now);
    const hard1 = scheduling_cards[Rating.Hard];

    card = hard1.card;
    now = card.due;
    scheduling_cards = f.repeat(card, now);
    const good1 = scheduling_cards[Rating.Good];

    card = good1.card;
    now = card.due;
    scheduling_cards = f.repeat(card, now);
    const again = scheduling_cards[Rating.Again];

    card = again.card;
    now = card.due;
    scheduling_cards = f.repeat(card, now);
    const easy1 = scheduling_cards[Rating.Easy];

    card = easy1.card;
    now = card.due;
    scheduling_cards = f.repeat(card, now);
    const easy2 = scheduling_cards[Rating.Easy];

    card = easy2.card;
    now = card.due;
    scheduling_cards = f.repeat(card, now);
    const good2 = scheduling_cards[Rating.Good];

    card = good2.card;
    now = card.due;
    scheduling_cards = f.repeat(card, now);
    const hard2 = scheduling_cards[Rating.Hard];

    card = hard2.card;
    now = card.due;
    scheduling_cards = f.repeat(card, now);
    const hard3 = scheduling_cards[Rating.Hard];

    const data = [hard1, good1, again, easy1, easy2, good2, hard2, hard3];
    return data;
};

const generatorExample3 = (fsrsParameter?: FSRSParameters): example[] => {
    // new -> good -> good->again->easy->hard->good->again->good
    const params = generatorParameters(fsrsParameter);
    const f = fsrs(params);
    let card = createEmptyCard()
    let now = new Date("2023-10-10 10:00:00");
    let scheduling_cards = f.repeat(card, now);
    const good1 = scheduling_cards[Rating.Good];

    card = good1.card;
    now = card.due;
    scheduling_cards = f.repeat(card, now);
    const good2 = scheduling_cards[Rating.Good];

    card = good2.card;
    now = card.due;
    scheduling_cards = f.repeat(card, now);
    const again1 = scheduling_cards[Rating.Again];

    card = again1.card;
    now = card.due;
    scheduling_cards = f.repeat(card, now);
    const easy1 = scheduling_cards[Rating.Easy];

    card = easy1.card;
    now = card.due;
    scheduling_cards = f.repeat(card, now);
    const hard = scheduling_cards[Rating.Hard];

    card = hard.card;
    now = card.due;
    scheduling_cards = f.repeat(card, now);
    const good3 = scheduling_cards[Rating.Good];

    card = good3.card;
    now = card.due;
    scheduling_cards = f.repeat(card, now);
    const again2 = scheduling_cards[Rating.Again];

    card = again2.card;
    now = card.due;
    scheduling_cards = f.repeat(card, now);
    const good4 = scheduling_cards[Rating.Good];

    const data = [good1, good2, again1, easy1, hard, good3, again2, good4];
    return data;
};

const generatorExample4 = (fsrsParameter?: FSRSParameters): example[] => {
    // new -> easy -> good->again->easy->hard->good->hard->good
    const params = generatorParameters(fsrsParameter);
    const f = fsrs(params);
    let card = createEmptyCard()
    let now = new Date("2023-10-10 10:00:00");
    let scheduling_cards = f.repeat(card, now);
    const easy1 = scheduling_cards[Rating.Easy];

    card = easy1.card;
    now = card.due;
    scheduling_cards = f.repeat(card, now);
    const good1 = scheduling_cards[Rating.Good];

    card = good1.card;
    now = card.due;
    scheduling_cards = f.repeat(card, now);
    const again1 = scheduling_cards[Rating.Again];

    card = again1.card;
    now = card.due;
    scheduling_cards = f.repeat(card, now);
    const easy2 = scheduling_cards[Rating.Easy];

    card = easy2.card;
    now = card.due;
    scheduling_cards = f.repeat(card, now);
    const hard1 = scheduling_cards[Rating.Hard];

    card = hard1.card;
    now = card.due;
    scheduling_cards = f.repeat(card, now);
    const good2 = scheduling_cards[Rating.Good];

    card = good2.card;
    now = card.due;
    scheduling_cards = f.repeat(card, now);
    const hard2 = scheduling_cards[Rating.Hard];

    card = hard2.card;
    now = card.due;
    scheduling_cards = f.repeat(card, now);
    const good3 = scheduling_cards[Rating.Good];

    const data = [easy1, good1, again1, easy2, hard2, good2, hard2, good3];
    return data;
};

export {generatorExample1, generatorExample2, generatorExample3, generatorExample4}

export type {example}