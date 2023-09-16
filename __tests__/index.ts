import {
    fsrs,
    Rating,
    State
} from '../src/fsrs';
import {example, generatorExample1, generatorExample2, generatorExample3, generatorExample4} from "./example";
import seedrandom from 'seedrandom';
import { int } from '../src/fsrs/help';
const f=fsrs()

const random_diff=(diff:number)=>{
    const generator = seedrandom(new Date().getTime().toString());
    const fuzz_factor = generator();
    const max_ivl = Math.max(2,diff*0.95-1);
    const min_ivl = diff*1.05+1
    return Math.floor(fuzz_factor * (max_ivl - min_ivl + 1) + min_ivl) as int;
}

const print_scheduling_card = (item: example) => {
    const diff_day = item.card.due.diff(item.card.last_review as Date,'days')
    const random_day = diff_day==0? 0 as int: random_diff(diff_day)
    console.group(`${Rating[item.log.rating]}`);
        console.table({
            [`${Rating[item.log.rating]}.card:`]: {
                ...item.card,
                due: item.card.due.format(),
                state:`${item.card.state}(${State[item.card.state]})`,
                last_review: item.card.last_review? item.card.last_review.format():"",
                diff: item.card.due.dueFormat(item.card.last_review as Date, true),
                R:f.get_retrievability(item.card,(item.card.last_review as Date).scheduler(random_day,true)),
                Random_Day:random_day==0? 'N/A': random_day+'day'
            }
        });
        console.table({
            [`${Rating[item.log.rating]}.review_log`]:{
                ...item.log,
                rating:`${item.log.rating}(${Rating[item.log.rating]})`,
                state:`${item.log.state}(${State[item.log.state]})`,
                review: item.log.review.format(),
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

test()