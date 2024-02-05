import {fixDate, show_diff_message} from "../src/fsrs";

test("show_diff_message_bad_type", () => {
  const TIMEUNITFORMAT_TEST = ["秒", "分", "时", "天", "月", "年"];
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
  expect(fixDate(t2).dueFormat(fixDate(t1),true,TIMEUNITFORMAT_TEST)).toEqual("1天");

  // @ts-ignore
  expect(show_diff_message(t4, t3)).toBe("1");
  // @ts-ignore
  expect(show_diff_message(t4, t3, true)).toEqual("1day");
  expect(fixDate(t4).dueFormat(fixDate(t3),true,TIMEUNITFORMAT_TEST)).toEqual("1天");

  // @ts-ignore
  expect(show_diff_message(t6, t5)).toBe("1");
  // @ts-ignore
  expect(show_diff_message(t6, t5, true)).toEqual("1day");
  expect(fixDate(t6).dueFormat(fixDate(t5),true,TIMEUNITFORMAT_TEST)).toEqual("1天");

});

test("show_diff_message_min", () => {
  const TIMEUNITFORMAT_TEST = ["秒", "分", "时", "天", "月", "年"];
  //https://github.com/ishiko732/ts-fsrs/issues/19
  const t1 = new Date();
  const t2 = new Date(t1.getTime() + 1000 * 60);
  const t3 = new Date(t1.getTime() + 1000 * 60 * 59);
  expect(show_diff_message(t2, t1)).toBe("1");
  expect(show_diff_message(t2, t1, true)).toEqual("1min");
  expect(fixDate(t2).dueFormat(fixDate(t1),true,TIMEUNITFORMAT_TEST)).toEqual("1分");

  expect(show_diff_message(t3, t1, true)).toEqual("59min");
  expect(fixDate(t3).dueFormat(fixDate(t1),true,TIMEUNITFORMAT_TEST)).toEqual("59分");
});

test("show_diff_message_hour", () => {
  const TIMEUNITFORMAT_TEST = ["秒", "分", "小时", "天", "月", "年"];
  //https://github.com/ishiko732/ts-fsrs/issues/19
  const t1 = new Date();
  const t2 = new Date(t1.getTime() + 1000 * 60 * 60);
  const t3 = new Date(t1.getTime() + 1000 * 60 * 60 * 59);
  expect(show_diff_message(t2, t1)).toBe("1");

  expect(show_diff_message(t2, t1, true)).toEqual("1hour");
  expect(fixDate(t2).dueFormat(fixDate(t1),true,TIMEUNITFORMAT_TEST)).toEqual("1小时");

  expect(show_diff_message(t3, t1, true)).not.toBe("59hour");
  expect(fixDate(t3).dueFormat(fixDate(t1),true,TIMEUNITFORMAT_TEST)).not.toEqual("59小时");

  expect(show_diff_message(t3, t1, true)).toBe("2day");
  expect(fixDate(t3).dueFormat(fixDate(t1),true,TIMEUNITFORMAT_TEST)).toEqual("2天");
});

test("show_diff_message_day", () => {
  const TIMEUNITFORMAT_TEST = ["秒", "分", "小时", "天", "个月", "年"];
  //https://github.com/ishiko732/ts-fsrs/issues/19
  const t1 = new Date();
  const t2 = new Date(t1.getTime() + 1000 * 60 * 60 * 24);
  const t3 = new Date(t1.getTime() + 1000 * 60 * 60 * 24 * 30);
  const t4 = new Date(t1.getTime() + 1000 * 60 * 60 * 24 * 31);
  expect(show_diff_message(t2, t1)).toBe("1");
  expect(show_diff_message(t2, t1, true)).toEqual("1day");
  expect(fixDate(t2).dueFormat(fixDate(t1),true,TIMEUNITFORMAT_TEST)).toEqual("1天");

  expect(show_diff_message(t3, t1)).toBe("30");
  expect(show_diff_message(t3, t1, true)).toEqual("30day");
  expect(fixDate(t3).dueFormat(fixDate(t1),true,TIMEUNITFORMAT_TEST)).toEqual("30天");

  expect(show_diff_message(t4, t1)).not.toBe("31");
  expect(show_diff_message(t4, t1, true)).toEqual("1month");
  expect(fixDate(t4).dueFormat(fixDate(t1),true,TIMEUNITFORMAT_TEST)).toEqual("1个月");
});

test("show_diff_message_month", () => {
  const TIMEUNITFORMAT_TEST = ["秒", "分", "小时", "天", "个月", "年"];
  //https://github.com/ishiko732/ts-fsrs/issues/19
  const t1 = new Date();
  const t2 = new Date(t1.getTime() + 1000 * 60 * 60 * 24 * 31);
  const t3 = new Date(t1.getTime() + 1000 * 60 * 60 * 24 * 31 * 12);
  const t4 = new Date(t1.getTime() + 1000 * 60 * 60 * 24 * 31 * 13);
  expect(show_diff_message(t2, t1)).toBe("1");
  expect(show_diff_message(t2, t1, true)).toEqual("1month");
  expect(fixDate(t2).dueFormat(fixDate(t1),true,TIMEUNITFORMAT_TEST)).toEqual("1个月");

  expect(show_diff_message(t3, t1)).not.toBe("12");
  expect(show_diff_message(t3, t1, true)).not.toEqual("12month");
  expect(fixDate(t3).dueFormat(fixDate(t1),true,TIMEUNITFORMAT_TEST)).not.toEqual("12个月");

  expect(show_diff_message(t4, t1)).not.toBe("13");
  expect(show_diff_message(t4, t1, true)).toEqual("1year");
  expect(fixDate(t4).dueFormat(fixDate(t1),true,TIMEUNITFORMAT_TEST)).toEqual("1年");
});

test("show_diff_message_year", () => {
  const TIMEUNITFORMAT_TEST = ["秒", "分", "小时", "天", "个月", "年"];
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
  expect(fixDate(t2).dueFormat(fixDate(t1),true,TIMEUNITFORMAT_TEST)).toEqual("1年");

  expect(show_diff_message(t3, t1)).toBe("1");
  expect(show_diff_message(t3, t1, true)).toEqual("1year");
  expect(fixDate(t3).dueFormat(fixDate(t1),true,TIMEUNITFORMAT_TEST)).toEqual("1年");

  expect(show_diff_message(t4, t1)).toBe("2");
  expect(show_diff_message(t4, t1, true)).toEqual("2year");
  expect(fixDate(t4).dueFormat(fixDate(t1),true,TIMEUNITFORMAT_TEST)).toEqual("2年");
});

test("wrong timeUnit length", () => {
  const TIMEUNITFORMAT_TEST = ["年"];
  const t1 = new Date();
  const t2 = new Date(t1.getTime() + 1000 * 60 * 60 * 24 * 31 * 13);
  expect(show_diff_message(t2, t1)).toBe("1");
  expect(show_diff_message(t2, t1, true)).toEqual("1year");
  expect(fixDate(t2).dueFormat(fixDate(t1),true,TIMEUNITFORMAT_TEST)).not.toEqual("1年");
  expect(fixDate(t2).dueFormat(fixDate(t1),true,TIMEUNITFORMAT_TEST)).toEqual("1year");
});

test("Date data real type is string/number", ()=>{
  const TIMEUNITFORMAT_TEST = ["年"];
  const t1 = new Date();
  const t2 = new Date(t1.getTime() + 1000 * 60 * 60 * 24 * 31 * 13).toDateString();
  expect(show_diff_message(t2, t1.getTime())).toBe("1");
  expect(show_diff_message(t2, t1.toUTCString(), true)).toEqual("1year");
  expect(fixDate(t2).dueFormat(fixDate(t1),true,TIMEUNITFORMAT_TEST)).not.toEqual("1年");
  expect(fixDate(t2).dueFormat(fixDate(t1),true,TIMEUNITFORMAT_TEST)).toEqual("1year");
})