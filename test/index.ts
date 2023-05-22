import {
    fsrs,
    FSRS_Version,
    Rating,
} from '../src/fsrs';
import {example, generatorExample1, generatorExample2, generatorExample3, generatorExample4} from "./example";
import seedrandom from 'seedrandom';
import { date_diff, date_scheduler, formatDate, show_diff_message } from '../src/date_help';
const f=fsrs()

const random_diff=(diff:number)=>{
    const generator = seedrandom(new Date().getTime().toString());
    const fuzz_factor = generator();
    const max_ivl = Math.max(2,diff*0.95-1);
    const min_ivl = diff*1.05+1
    return Math.floor(fuzz_factor * (max_ivl - min_ivl + 1) + min_ivl);
}


const print_scheduling_card = (item: example) => {
    const diff_day = date_diff(item.card.due,item.card.last_review as Date,'days')
    const random_day = diff_day==0? 0: random_diff(diff_day)
    console.group(`${Rating[item.log.rating]}`);
        console.table({
            [`${Rating[item.log.rating]}.card:`]: {
                ...item.card,
                due: formatDate(item.card.due),
                last_review: item.card.last_review? formatDate(item.card.last_review):"",
                diff: show_diff_message(item.card.due, item.card.last_review as Date, true),
                R:f.get_retrievability(item.card,date_scheduler(item.card.last_review as Date,random_day,true)),
                Random_Day:random_day==0? 'N/A': random_day+'day'
            }
        });
        console.table({
            [`${Rating[item.log.rating]}.review_log`]:{
                ...item.log,
                review: formatDate(item.log.review),
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