import type { int, unit } from "./type";
import {Grade, Rating, State} from "./models";

declare global {
  export interface Date {
    scheduler(t: int, isDay?: boolean): Date;

    diff(pre: Date, unit: unit): int;

    format(): string;

    dueFormat(last_review: Date, unit?: boolean): string;
  }
}

Date.prototype.scheduler = function (t: int, isDay?: boolean): Date {
  return date_scheduler(this, t, isDay);
};

/**
 * 当前时间与之前的时间差值
 * @param pre 比当前时间还要之前
 * @param unit 单位: days | minutes
 */
Date.prototype.diff = function (pre: Date, unit: unit): int {
  return date_diff(this, pre, unit) as int;
};

Date.prototype.format = function (): string {
  return formatDate(this);
};

Date.prototype.dueFormat = function (last_review: Date, unit?: boolean) {
  return show_diff_message(this, last_review, unit);
};

/**
 * 计算日期和时间的偏移，并返回一个新的日期对象。
 * @param now 当前日期和时间
 * @param t 时间偏移量，当 isDay 为 true 时表示天数，为 false 时表示分钟
 * @param isDay （可选）是否按天数单位进行偏移，默认为 false，表示按分钟单位计算偏移
 * @returns 偏移后的日期和时间对象
 */
export function date_scheduler(now: Date, t: number, isDay?: boolean): Date {
  return new Date(
    isDay
      ? now.getTime() + t * 24 * 60 * 60 * 1000
      : now.getTime() + t * 60 * 1000,
  );
}

export function date_diff(now: Date, pre: Date, unit: unit): number {
  if (!now || !pre) {
    throw new Error("Invalid date");
  }
  const diff = now.getTime() - pre.getTime();
  let r = 0;
  switch (unit) {
    case "days":
      r = Math.floor(diff / (24 * 60 * 60 * 1000));
      break;
    case "minutes":
      r = Math.floor(diff / (60 * 1000));
      break;
  }
  return r;
}

export function formatDate(date: Date): string {
  const year: number = date.getFullYear();
  const month: number = date.getMonth() + 1;
  const day: number = date.getDate();
  const hours: number = date.getHours();
  const minutes: number = date.getMinutes();
  const seconds: number = date.getSeconds();

  return `${year}-${padZero(month)}-${padZero(day)} ${padZero(hours)}:${padZero(
    minutes,
  )}:${padZero(seconds)}`;
}

function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

const TIMEUNIT = [60, 60, 24, 31, 12];
const TIMEUNITFORMAT = ["second", "min", "hour", "day", "month", "year"];

export function show_diff_message(
  due: Date,
  last_review: Date,
  unit?: boolean,
  timeUnit: string[] = TIMEUNITFORMAT,
): string {
  due = fixDate(due);
  last_review = fixDate(last_review);
  if (timeUnit.length !== TIMEUNITFORMAT.length) {
    timeUnit = TIMEUNITFORMAT;
  }
  let diff = due.getTime() - last_review.getTime();
  let i;
  diff /= 1000;
  for (i = 0; i < TIMEUNIT.length; i++) {
    if (diff < TIMEUNIT[i]) {
      break;
    } else {
      diff /= TIMEUNIT[i];
    }
  }
  return `${Math.floor(diff)}${unit ? timeUnit[i] : ""}`;
}

export function fixDate(value: unknown) {
  if (typeof value === "object" && value instanceof Date) {
    return value;
  } else if (typeof value === "string") {
    const timestamp = Date.parse(value);
    if (!isNaN(timestamp)) {
      return new Date(timestamp);
    } else {
      throw new Error(`Invalid date:[${value}]`);
    }
  } else if (typeof value === "number") {
    return new Date(value);
  }
  throw new Error(`Invalid date:[${value}]`);
}

export function fixState(value: unknown): State {
  if (typeof value === "string") {
    return State[value as keyof typeof State];
  } else if (typeof value === "number") {
    return value as State;
  }
  throw new Error(`Invalid state:[${value}]`);
}

export function fixRating(value: unknown): Rating {
  if (typeof value === "string") {
    return Rating[value as keyof typeof Rating];
  } else if (typeof value === "number") {
    return value as Rating;
  }
  throw new Error(`Invalid rating:[${value}]`);
}


export const Grades: Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy];