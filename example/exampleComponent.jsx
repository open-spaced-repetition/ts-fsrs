const { State, Rating,createEmptyCard,generatorParameters } = tsfsrs

const ExampleCard = ({ cardRecord, f, className }) => {
    return <table className={className}>
        <thead>
            <tr>
                <th>index</th>
                <th>due</th>
                <th>state</th>
                <th>last_review</th>
                <th>stability</th>
                <th>difficulty</th>
                <th>R</th>
                <th>elapsed_days</th>
                <th>scheduled_days</th>
                <th>reps</th>
                <th>lapses</th>
            </tr>
        </thead>
        <tbody className="text-sm text-center">
            {cardRecord.map((record, index) => <tr className="hover:bg-zinc-200">
                <td>{index + 1}</td>
                <td>{record.due.toLocaleString()}</td>
                <td>{`${record.state}(${State[record.state]})`}</td>
                <td>{record.last_review.toLocaleString()}</td>
                <td>{record.stability.toFixed(2)}</td>
                <td>{record.difficulty.toFixed(2)}</td>
                <td>{f.get_retrievability(record, record.due) || '/'}</td>
                <td>{record.elapsed_days}</td>
                <td>{record.scheduled_days}</td>
                <td>{record.reps}</td>
                <td>{record.lapses}</td>
            </tr>)}
            <tr>
            </tr>
        </tbody>
    </table>
}

const ExampleLog = ({ logRecord, className }) => {
    return <table className={className}>
        <thead>
            <tr>
                <th>#</th>
                <th>rating</th>
                <th>state</th>
                <th>due</th>
                <th>elapsed_days</th>
                <th>scheduled_days</th>
                <th>review</th>
            </tr>
        </thead>
        <tbody className="text-sm text-center">
            {logRecord.map((record) => <tr className="hover:bg-zinc-200">
                <th>{'=>'}</th>
                <td>{`${record.rating}(${Rating[record.rating]})`}</td>
                <td>{`${record.state}(${State[record.state]})`}</td>
                <td>{record.due.toLocaleString()}</td>
                <td>{record.elapsed_days}</td>
                <td>{record.scheduled_days}</td>
                <td>{record.review.toLocaleString()}</td>
            </tr>)}
            <tr>
            </tr>
        </tbody>
    </table>
}

const ScheduledButton = ({ rating, children, handleClick }) => {
    return <button onClick={(e) => handleClick(e, rating)}
        rating={rating}
        className="mx-4 px-4 py-2 font-semibold text-sm bg-sky-500 hover:bg-cyan-500 text-white rounded-none shadow-sm">
        {children}
    </button>
}

const ExampleGenerator = ({ f, cards, setCards, setLogs, className }) => {
    const [review, setReview] = React.useState(new Date())
    React.useEffect(() => {
        if (cards.length > 0) {
            setReview(cards[cards.length - 1].due)
        }
    }, [cards])
    const handleClick = (e, rating) => {
        console.log(Rating[rating])
        const preCard = cards.length>0?cards[cards.length - 1]:createEmptyCard(new Date())
        const scheduling_cards = f.repeat(preCard, preCard.due);
        console.log(scheduling_cards)
        setCards(pre => [...pre, scheduling_cards[rating].card])
        setLogs(pre => [...pre, scheduling_cards[rating].log])
    }
    return <div>
        <ScheduledButton rating={Rating.Again} handleClick={handleClick}>Again</ScheduledButton>
        <ScheduledButton rating={Rating.Hard} handleClick={handleClick}>Hard</ScheduledButton>
        <ScheduledButton rating={Rating.Good} handleClick={handleClick}>Good</ScheduledButton>
        <ScheduledButton rating={Rating.Easy} handleClick={handleClick}>Easy</ScheduledButton>
        <div className="pt-4">Next review:{review.toLocaleString()}</div>
    </div>

}


const DefaultParams = () => {
    const defaultParams = generatorParameters()
    return <div className="w-1/2 mx-auto">
        <div>Default:</div>
        {Object.keys(defaultParams).map(key => <div>{`${key}:${defaultParams[key]}`}</div>)}
        </div>
}