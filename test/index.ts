import dayjs, {Dayjs} from "dayjs";
import {
    fsrs,
    FSRS_Version,
    Rating,
} from '../src/fsrs';
import {example, generatorExample1, generatorExample2, generatorExample3, generatorExample4} from "./example";
import seedrandom from 'seedrandom';
const f=fsrs()
const diff = (due: Dayjs, last_review?: Dayjs, unit?: boolean) => {
    const yearDiff = due.diff(last_review, "year")
    const dayDiff = due.diff(last_review, "day")
    const minuteDiff = due.diff(last_review, "minute")
    if (unit) {
        return yearDiff !== 0 ? yearDiff + "year" : dayDiff !== 0 ? dayDiff + "day" : minuteDiff + "min"
    }
    return yearDiff !== 0 ? yearDiff : dayDiff !== 0 ? dayDiff : minuteDiff
}

const random_diff=(diff:number)=>{
    const generator = seedrandom(dayjs().toISOString());
    const fuzz_factor = generator();
    const max_ivl = Math.max(2,diff*0.95-1);
    const min_ivl = diff*1.05+1
    return Math.floor(fuzz_factor * (max_ivl - min_ivl + 1) + min_ivl);
}


const print_scheduling_card = (item: example) => {
    const diff_day = item.card.due.diff(item.card.last_review,'days')
    const random_day = random_diff(diff_day)
    console.group(`${Rating[item.log.rating]}`);
        console.table({
            [`${Rating[item.log.rating]}.card:`]: {
                ...item.card,
                due: item.card.due.format("YYYY-MM-DD HH:mm:ss"),
                last_review: item.card.last_review?.format("YYYY-MM-DD HH:mm:ss"),
                diff: diff(item.card.due, item.card.last_review, true),
                R:f.get_retrievability(item.card,(item.card.last_review as Dayjs).add(random_day,'days')),
                Random_Day:random_day+'day'
            }
        });
        console.table({
            [`${Rating[item.log.rating]}.review_log`]:{
                ...item.log,
                review: item.log.review.format("YYYY-MM-DD HH:mm:ss"),
            }
        })
    console.groupEnd();
    console.log('----------------------------------------------------------------')
}


const test = () => {
    generatorExample1().forEach(item => print_scheduling_card(item));
    console.log("------------");
    generatorExample2().forEach(item => print_scheduling_card(item));
    console.log("------------");
    generatorExample3().forEach(item => print_scheduling_card(item));
    console.log("------------");
    generatorExample4().forEach(item => print_scheduling_card(item));
}

//test
console.log(`FSRS_Version:${FSRS_Version}`)
test()