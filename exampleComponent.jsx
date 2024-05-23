const { State, Rating, createEmptyCard, generatorParameters, fsrs } = tsfsrs;

const ExampleCard = ({ cardRecord, f, className }) => {
  return (
    <table className={className}>
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
        {cardRecord.map((record, index) => (
          <tr className="hover:bg-zinc-200">
            <td>{index + 1}</td>
            <td>{record.due.toLocaleString()}</td>
            <td>{`${record.state}(${State[record.state]})`}</td>
            <td>{record.last_review.toLocaleString()}</td>
            <td>{record.stability.toFixed(2)}</td>
            <td>{record.difficulty.toFixed(2)}</td>
            <td>{f.get_retrievability(record, record.due) || "/"}</td>
            <td>{record.elapsed_days}</td>
            <td>{record.scheduled_days}</td>
            <td>{record.reps}</td>
            <td>{record.lapses}</td>
          </tr>
        ))}
        <tr></tr>
      </tbody>
    </table>
  );
};

const ExampleLog = ({ logRecord, className }) => {
  return (
    <table className={className}>
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
        {logRecord.map((record) => (
          <tr className="hover:bg-zinc-200">
            <th>{"=>"}</th>
            <td>{`${record.rating}(${Rating[record.rating]})`}</td>
            <td>{`${record.state}(${State[record.state]})`}</td>
            <td>{record.due.toLocaleString()}</td>
            <td>{record.elapsed_days}</td>
            <td>{record.scheduled_days}</td>
            <td>{record.review.toLocaleString()}</td>
          </tr>
        ))}
        <tr></tr>
      </tbody>
    </table>
  );
};

const ScheduledButton = ({ rating, children, handleClick }) => {
  return (
    <button
      onClick={(e) => handleClick(e, rating)}
      rating={rating}
      className="mx-4 px-4 py-2 font-semibold text-sm bg-sky-500 hover:bg-cyan-500 text-white rounded-none shadow-sm"
    >
      {children}
    </button>
  );
};

const ExampleGenerator = ({ f, cards, setCards, setLogs, className }) => {
  const [review, setReview] = React.useState(new Date());
  React.useEffect(() => {
    if (cards.length > 0) {
      setReview(cards[cards.length - 1].due);
    }
  }, [cards]);
  const handleClick = (e, rating) => {
    console.log(Rating[rating]);
    const preCard =
      cards.length > 0 ? cards[cards.length - 1] : createEmptyCard(new Date());
    console.log(f.parameters);
    const scheduling_cards = f.repeat(preCard, preCard.due);
    console.log(scheduling_cards);
    setCards((pre) => [...pre, scheduling_cards[rating].card]);
    setLogs((pre) => [...pre, scheduling_cards[rating].log]);
  };
  return (
    <div>
      <ScheduledButton rating={Rating.Again} handleClick={handleClick}>
        Again
      </ScheduledButton>
      <ScheduledButton rating={Rating.Hard} handleClick={handleClick}>
        Hard
      </ScheduledButton>
      <ScheduledButton rating={Rating.Good} handleClick={handleClick}>
        Good
      </ScheduledButton>
      <ScheduledButton rating={Rating.Easy} handleClick={handleClick}>
        Easy
      </ScheduledButton>
      <div className="pt-4">Next review:{review.toLocaleString()}</div>
    </div>
  );
};

const ParamsComponent = ({ f, setF }) => {
  const handleChange = (key, value) => {
    console.log(key, value);
    setF((pre) => {
      const newF = fsrs({
        ...pre.parameters,
        [key]: value,
      });
      return newF;
    });
  };

  return (
    <div className="w-1/2 mx-auto">
      <div>Parameters:</div>
      <label htmlFor="request_retention" className="pr-4">
        request_retention:
      </label>
      <input
        name="request_retention"
        className="input input-bordered w-full"
        type="number"
        max={0.99}
        min={0.7}
        step={0.01}
        aria-label="request retention"
        defaultValue={f.parameters.request_retention}
        onChange={(e) =>
          e.target.value > 0 &&
          e.target.value < 1 &&
          handleChange("request_retention", e.target.value)
        }
      />
      <div className="label text-xs">
        Represents the probability of the target memory you want. Note that
        there is a trade-off between higher retention rates and higher
        repetition rates. It is recommended that you set this value between 0.8
        and 0.9.
      </div>

      <label htmlFor="maximum_interval" className="pr-4">
        maximum_interval:
      </label>
      <input
        name="maximum_interval"
        className="input input-bordered w-full"
        type="number"
        max={36500}
        min={7}
        step={1}
        aria-label="maximum interval"
        defaultValue={f.parameters.maximum_interval}
        onChange={(e) =>
          e.target.value > 0 && handleChange("maximum_interval", e.target.value)
        }
      />
      <div className="label text-xs">
        The maximum number of days between reviews of a card. When the review
        interval of a card reaches this number of days, the{" "}
        {`'hard', 'good', and 'easy'`} intervals will be consistent. The shorter
        the interval, the more workload.
      </div>

      <label htmlFor="w" className="pr-4">
        w:
      </label>
      <input
        name="w"
        className="input input-bordered w-full"
        type="text"
        aria-label="w"
        defaultValue={JSON.stringify(f.parameters.w)}
        onChange={(e) => {
          let value = e.target.value;
          if (value[0] !== "[") {
            value = `[${value}]`;
          }
          handleChange("w", JSON.parse(value));
        }}
      />
      <div className="label text-xs">
        Weights created by running the FSRS optimizer. By default, these are
        calculated from a sample dataset.
      </div>

      <div className="flex py-4">
        <label htmlFor="enable_fuzz" className="pr-4">
          enable_fuzz:
        </label>
        <input
          name="enable_fuzz"
          type="checkbox"
          className="toggle toggle-info mt-1"
          aria-label="enable fuzz"
          defaultChecked={f.parameters.enable_fuzz}
          onChange={(e) => handleChange("enable_fuzz", e.target.checked)}
        />
      </div>
      <div className="label text-xs">
        When enabled, this adds a small random delay to the new interval time to
        prevent cards from sticking together and always being reviewed on the
        same day.
      </div>
    </div>
  );
};
