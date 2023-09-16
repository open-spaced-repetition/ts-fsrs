import { show_diff_message } from "../src/fsrs";

test("show_diff_message_bad_type", () => {
  //https://github.com/ishiko732/ts-fsrs/issues/19
  const t1 = "1970-01-01T00:00:00.000Z";
  const t2 = "1970-01-02T00:00:00.000Z";
  const t3 = "1970-01-01 00:00:00";
  const t4 = "1970-01-02 00:00:00";

  const t5 = 0;
  const t6 = 1000*60*60*24;
  // @ts-ignore
  expect(show_diff_message(t2, t1)).toBe("1");
  // @ts-ignore
  expect(show_diff_message(t2, t1, true)).toEqual("1day");

  // @ts-ignore
  expect(show_diff_message(t4, t3)).toBe("1");
  // @ts-ignore
  expect(show_diff_message(t4, t3, true)).toEqual("1day");

  // @ts-ignore
  expect(show_diff_message(t6, t5)).toBe("1");
  // @ts-ignore
  expect(show_diff_message(t6, t5, true)).toEqual("1day");

});

test("show_diff_message_min", () => {
  //https://github.com/ishiko732/ts-fsrs/issues/19
  const t1 = new Date();
  const t2 = new Date(t1.getTime() + 1000 * 60);
  const t3 = new Date(t1.getTime() + 1000 * 60 * 59);
  expect(show_diff_message(t2, t1)).toBe("1");
  expect(show_diff_message(t2, t1, true)).toEqual("1min");
  expect(show_diff_message(t3, t1, true)).toEqual("59min");
});

test("show_diff_message_hour", () => {
  //https://github.com/ishiko732/ts-fsrs/issues/19
  const t1 = new Date();
  const t2 = new Date(t1.getTime() + 1000 * 60 * 60);
  const t3 = new Date(t1.getTime() + 1000 * 60 * 60 * 59);
  expect(show_diff_message(t2, t1)).toBe("1");
  expect(show_diff_message(t2, t1, true)).toEqual("1hour");

  expect(show_diff_message(t3, t1, true)).not.toBe("59hour");
  expect(show_diff_message(t3, t1, true)).toBe("2day");
});

test("show_diff_message_day", () => {
  //https://github.com/ishiko732/ts-fsrs/issues/19
  const t1 = new Date();
  const t2 = new Date(t1.getTime() + 1000 * 60 * 60 * 24);
  const t3 = new Date(t1.getTime() + 1000 * 60 * 60 * 24 * 30);
  const t4 = new Date(t1.getTime() + 1000 * 60 * 60 * 24 * 31);
  expect(show_diff_message(t2, t1)).toBe("1");
  expect(show_diff_message(t2, t1, true)).toEqual("1day");
  expect(show_diff_message(t3, t1)).toBe("30");
  expect(show_diff_message(t3, t1, true)).toEqual("30day");
  expect(show_diff_message(t4, t1)).not.toBe("31");
  expect(show_diff_message(t4, t1, true)).toEqual("1month");
});

test("show_diff_message_month", () => {
  //https://github.com/ishiko732/ts-fsrs/issues/19
  const t1 = new Date();
  const t2 = new Date(t1.getTime() + 1000 * 60 * 60 * 24 * 31);
  const t3 = new Date(t1.getTime() + 1000 * 60 * 60 * 24 * 31 * 12);
  const t4 = new Date(t1.getTime() + 1000 * 60 * 60 * 24 * 31 * 13);
  expect(show_diff_message(t2, t1)).toBe("1");
  expect(show_diff_message(t2, t1, true)).toEqual("1month");
  expect(show_diff_message(t3, t1)).not.toBe("12");
  expect(show_diff_message(t3, t1, true)).not.toEqual("12month");
  expect(show_diff_message(t4, t1)).not.toBe("13");
  expect(show_diff_message(t4, t1, true)).toEqual("1year");
});

test("show_diff_message_year", () => {
  //https://github.com/ishiko732/ts-fsrs/issues/19
  const t1 = new Date();
  const t2 = new Date(t1.getTime() + 1000 * 60 * 60 * 24 * 31 * 13);
  const t3 = new Date(
    t1.getTime() + 1000 * 60 * 60 * 24 * 31 * 13 + 1000 * 60 * 60 * 24,
  );
  const t4 = new Date(
    t1.getTime() + 1000 * 60 * 60 * 24 * 31 * 24 + 1000 * 60 * 60 * 24,
  );
  expect(show_diff_message(t2, t1)).toBe("1");
  expect(show_diff_message(t2, t1, true)).toEqual("1year");
  expect(show_diff_message(t3, t1)).toBe("1");
  expect(show_diff_message(t3, t1, true)).toEqual("1year");
  expect(show_diff_message(t4, t1)).toBe("2");
  expect(show_diff_message(t4, t1, true)).toEqual("2year");
});
