import {Card, Rating, SchedulingLog, State} from "./models";
import {Dayjs} from "dayjs";


export class SchedulingCard {
    again: Card
    hard: Card
    good: Card
    easy: Card

    private copy(card: Card): Card {
        return {
            ...card,
            due: card.due.clone(),
            last_review: card.last_review?.clone()
        }
    }


    constructor(card: Card) {
        this.again = this.copy(card);
        this.hard = this.copy(card);
        this.good = this.copy(card);
        this.easy = this.copy(card);
    }

    update_state(state: State) {
        if (state === State.New) {
            this.again.state = State.Learning
            this.hard.state = State.Learning
            this.good.state = State.Learning
            this.easy.state = State.Review
            this.again.lapses += 1
        } else if (state === State.Learning || state === State.Relearning) {
            this.again.state = state
            this.hard.state = state
            this.good.state = State.Review
            this.easy.state = State.Review
        } else if (state === State.Review) {
            this.again.state = State.Relearning
            this.hard.state = State.Review
            this.good.state = State.Review
            this.easy.state = State.Review
            this.again.lapses += 1
        }
        return this;
    }

    schedule(now: Dayjs, hard_interval: number, good_interval: number, easy_interval: number): SchedulingCard {
        this.again.scheduled_days = 0
        this.hard.scheduled_days = hard_interval
        this.good.scheduled_days = good_interval
        this.easy.scheduled_days = easy_interval
        this.again.due = now.add(5, 'minutes')
        this.hard.due = hard_interval>0 ? now.add(hard_interval, 'days') :now.add(10, 'minutes')
        this.good.due = now.add(good_interval, 'days')
        this.easy.due = now.add(easy_interval, 'days')
        return this;
    }

    record_log(card: Card, now: Dayjs) {
        return <SchedulingLog>{
            [Rating.Again]: {
                card: this.again,
                log: {
                    rating: Rating.Again,
                    state: card.state,
                    elapsed_days: this.again.scheduled_days,
                    scheduled_days: card.elapsed_days,
                    review: now
                }
            },
            [Rating.Hard]: {
                card: this.hard,
                log: {
                    rating: Rating.Hard,
                    state: card.state,
                    elapsed_days: this.again.scheduled_days,
                    scheduled_days: card.elapsed_days,
                    review: now
                }
            },
            [Rating.Good]: {
                card: this.good,
                log: {
                    rating: Rating.Good,
                    state: card.state,
                    elapsed_days: this.again.scheduled_days,
                    scheduled_days: card.elapsed_days,
                    review: now
                }
            },
            [Rating.Easy]: {
                card: this.easy,
                log: {
                    rating: Rating.Easy,
                    state: card.state,
                    elapsed_days: this.again.scheduled_days,
                    scheduled_days: card.elapsed_days,
                    review: now
                }
            }
        }
    }
}
