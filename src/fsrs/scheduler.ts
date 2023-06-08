import { Card, Rating, SchedulingLog, State } from './models';
import { date_scheduler } from './help';


export class SchedulingCard {
    again: Card
    hard: Card
    good: Card
    easy: Card

    private copy(card: Card): Card {
        return {
            ...card
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

    schedule(now: Date, hard_interval: number, good_interval: number, easy_interval: number): SchedulingCard {
        this.again.scheduled_days = 0
        this.hard.scheduled_days = hard_interval
        this.good.scheduled_days = good_interval
        this.easy.scheduled_days = easy_interval
        this.again.due = date_scheduler(now,5)
        this.hard.due = hard_interval>0 ? date_scheduler(now,hard_interval,true) :date_scheduler(now,10)
        this.good.due = date_scheduler(now,good_interval,true)
        this.easy.due = date_scheduler(now,easy_interval,true)
        return this;
    }

    record_log(card: Card, now: Date) {
        return {
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
