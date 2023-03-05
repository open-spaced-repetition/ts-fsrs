import dayjs from "dayjs";
import seedrandom from "seedrandom";
import {Card, FSRSParameters, generatorParameters, Rating, SchedulingCard, State} from "./index";

export default class FSRS {
    private param: FSRSParameters
    private readonly intervalModifier;
    private seed: string;

    constructor(param?: FSRSParameters) {
        this.param = param || generatorParameters();
        this.intervalModifier = Math.log(this.param.request_retention) / Math.log(0.9);
        this.seed = this.param.enable_fuzz ? "" : String(this.param.maximum_interval) + String(this.param.easy_bonus)
    }

    repeat = (card: Card, now: dayjs.Dayjs) => {
        card = {
            ...card
        }
        now = now.clone();
        card.elapsed_days = card.state === State.New ? 0 : now.diff(dayjs(card.last_review), "days")//相距时间
        card.last_review = now; // 上次复习时间
        card.reps += 1;
        const s = new SchedulingCard(card);
        s.update_state(card.state);
        this.seed = String(card.last_review.unix()) + String(card.elapsed_days)
        let easy_interval, good_interval, hard_interval;
        switch (card.state) {
            case State.New:
                this.init_ds(s);
                s.again.due = now.add(1, 'minutes')
                s.hard.due = now.add(5, "minutes")
                s.good.due = now.add(10, "minutes")
                easy_interval = this.next_interval(s.easy.stability * this.param.easy_bonus);
                s.easy.scheduled_days = easy_interval
                s.easy.due = now.add(easy_interval, "days")
                break;
            case State.Learning:
            case State.Relearning:
                hard_interval = this.next_interval(s.hard.stability)
                good_interval = Math.max(this.next_interval(s.good.stability), hard_interval + 1)
                easy_interval = Math.max(this.next_interval(s.easy.stability * this.param.easy_bonus), good_interval + 1)
                s.schedule(now, hard_interval, good_interval, easy_interval)
                break;
            case State.Review:
                const interval = card.elapsed_days
                const last_d = card.difficulty
                const last_s = card.stability
                const retrievability = Math.exp(Math.log(0.9) * interval / last_s)
                this.next_ds(s, last_d, last_s, retrievability)
                hard_interval = this.next_interval(last_s * this.param.hard_factor)
                good_interval = this.next_interval(s.good.stability)
                hard_interval = Math.min(hard_interval, good_interval)
                good_interval = Math.max(good_interval, hard_interval + 1)
                easy_interval = Math.max(this.next_interval(s.easy.stability * this.param.hard_factor), good_interval + 1)
                s.schedule(now, hard_interval, good_interval, easy_interval)
                break
        }
        return s.record_log(card, now);
    }

    init_ds(s: SchedulingCard): void {
        s.again.difficulty = this.init_difficulty(Rating.Again)
        s.again.stability = this.init_stability(Rating.Again)
        s.hard.difficulty = this.init_difficulty(Rating.Hard)
        s.hard.stability = this.init_stability(Rating.Hard)
        s.good.difficulty = this.init_difficulty(Rating.Good)
        s.good.stability = this.init_stability(Rating.Good)
        s.easy.difficulty = this.init_difficulty(Rating.Easy)
        s.easy.stability = this.init_stability(Rating.Easy)
    }

    /**
     *
     * @param s 调度卡片
     * @param last_d 难度
     * @param last_s 稳定性
     * @param retrievability 可提取性
     */
    next_ds(s: SchedulingCard, last_d: number, last_s: number, retrievability: number): void {
        s.again.difficulty = this.next_difficulty(last_d, Rating.Again)
        s.again.stability = this.next_forget_stability(s.again.difficulty, last_s, retrievability)
        s.hard.difficulty = this.next_difficulty(last_d, Rating.Hard)
        s.hard.stability = this.next_recall_stability(s.hard.difficulty, last_s, retrievability)
        s.good.difficulty = this.next_difficulty(last_d, Rating.Good)
        s.good.stability = this.next_recall_stability(s.good.difficulty, last_s, retrievability)
        s.easy.difficulty = this.next_difficulty(last_d, Rating.Easy)
        s.easy.stability = this.next_recall_stability(s.easy.difficulty, last_s, retrievability)
    }

    /**
     * 初始化记忆稳定化衰减
     * @param r Rating
     */
    init_stability(r: number): number {
        return Math.max(this.param.w[0] + this.param.w[1] * r, 0.1)
    }

    /**
     * 初始化记忆稳定化曲线
     * @param r Rating
     */
    init_difficulty(r: number): number {
        return Math.min(Math.max(this.param.w[2] + this.param.w[3] * (r - 2), 1), 10)
    }

    apply_fuzz(ivl: number) {
        if (!this.param.enable_fuzz || ivl < 2.5) return ivl;
        const generator = seedrandom(this.seed);
        const fuzz_factor = generator();
        ivl = Math.round(ivl);
        const min_ivl = Math.max(2, Math.round(ivl * 0.95 - 1));
        const max_ivl = Math.round(ivl * 1.05 + 1);
        return Math.floor(fuzz_factor * (max_ivl - min_ivl + 1) + min_ivl);
    }

    next_interval(s: number): number {
        const newInterval = this.apply_fuzz(s * this.intervalModifier);
        return Math.min(Math.max(Math.round(newInterval), 1), this.param.maximum_interval);
    }


    next_difficulty(d: number, r: number): number {
        const next_d = d + this.param.w[4] * (r - 2)
        return this.constrain_difficulty(this.mean_reversion(this.param.w[2], next_d))

    }

    constrain_difficulty(difficulty: number) {
        return Math.min(Math.max(Number(difficulty.toFixed(2)), 1), 10);
    }

    mean_reversion(init: number, current: number): number {
        return this.param.w[5] * init + (1 - this.param.w[5]) * current
    }

    next_recall_stability(d: number, s: number, r: number): number {
        return s * (1 + Math.exp(this.param.w[6]) *
            (11 - d) *
            Math.pow(s, this.param.w[7]) *
            (Math.exp((1 - r) * this.param.w[8]) - 1))
    }

    next_forget_stability(d: number, s: number, r: number): number {
        return this.param.w[9] * Math.pow(d, this.param.w[10]) * Math.pow(s, this.param.w[11]) * Math.exp((1 - r) * this.param.w[12])
    }
}