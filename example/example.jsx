/* eslint-disable no-undef */
const { generatorParameters, fsrs, createEmptyCard, State, Rating } = tsfsrs

const App = ({ cardRecord, logRecord }) => {
    const [cards, setCards] = React.useState(cardRecord || [])
    const [logs, setLogs] = React.useState(logRecord || [])
    const [f, setF] = React.useState(fsrs())
    return <React.Fragment className="w-full">
        <div className="text-xl text-center">Current TS-FSRS Version:{tsfsrs.FSRSVersion}</div>
        <div className="text-lg text-center">Example</div>
        <div className="flex">
            <ExampleCard cardRecord={cards} f={f} className={"flex-initial w-1/2 pr-2 "}/>
            <ExampleLog logRecord={logs} className={"flex-initial w-1/2"}/>
        </div>
        <div className="flex justify-center mt-8"><ExampleGenerator cards={cards} setCards={setCards} setLogs={setLogs} f={f} /></div>
        <ParamsComponent f={f} setF={setF}/>
    </React.Fragment>;
};
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);