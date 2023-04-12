import {Dayjs} from "dayjs";
import {
    fsrs,
    FSRS_Version,
    Rating,
} from '../src/fsrs';
import {example, generatorExample1, generatorExample2, generatorExample3, generatorExample4} from "./example";
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

const print_scheduling_card = (item: example) => {
    console.log(`${Rating[item.log.rating]}.card:`, {
        ...item.card,
        due: item.card.due.format("YYYY-MM-DD HH:mm:ss"),
        last_review: item.card.last_review?.format("YYYY-MM-DD HH:mm:ss"),
        diff: diff(item.card.due, item.card.last_review, true),
        R:f.current_retrievability(item.card.elapsed_days,item.card.stability)
    });
    console.log(`${Rating[item.log.rating]}.review_log`, {
        ...item.log,
        review: item.log.review.format("YYYY-MM-DD HH:mm:ss"),
    })
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