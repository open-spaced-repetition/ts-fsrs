export type unit = 'days' | 'minutes'
export type int = number & { __int__: void };
export type double = number & { __double__: void };
declare global {
  export interface Date {
    scheduler(t: int, isDay?: boolean): Date;

    diff(pre: Date, unit: unit): int;

    format(): string;

    dueFormat(last_review: Date, unit?: boolean): string;
  }
}

Date.prototype.scheduler = function(t: int, isDay?: boolean): Date {
  return date_scheduler(this, t, isDay);
};

/**
 * 当前时间与之前的时间差值
 * @param pre 比当前时间还要之前
 * @param unit 单位: days | minutes
 */
Date.prototype.diff = function(pre: Date, unit: unit): int {
  return date_diff(this, pre, unit) as int;
};

Date.prototype.format = function(): string {
  return formatDate(this);
};

Date.prototype.dueFormat = function(last_review: Date, unit?: boolean) {
  return show_diff_message(this, last_review, unit);
};


export function date_scheduler(now: Date, t: number, isDay?: boolean): Date {
  return new Date(isDay ? now.getTime() + t * 24 * 60 * 60 * 1000 : now.getTime() + t * 60 * 1000);
}


export function date_diff(now: Date, pre: Date, unit: unit): number {
  const diff = now.getTime() - pre.getTime();
  let r = 0;
  switch (unit) {
    case 'days':
      r = Math.floor((diff) / (24 * 60 * 60 * 1000));
      break;
    case 'minutes':
      r = Math.floor((diff) / (60 * 1000));
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

  return `${year}-${padZero(month)}-${padZero(day)} ${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
}

function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

export function show_diff_message(due: Date, last_review: Date, unit?: boolean): string {
  const diff = due.getTime() - last_review.getTime();

  if (diff < 1000 * 60 * 60) { // 小于1小时
    return unit ? Math.floor((diff) / (60 * 1000)) + 'min' : String(Math.floor((diff) / (60 * 1000)));
  } else if (diff >= 1000 * 60 * 60 && diff < 1000 * 60 * 60 * 24) { // 大于1小时,小于1天
    return unit ? Math.floor((diff) / (60 * 60 * 1000)) + 'hour' : String(Math.floor((diff) / (60 * 60 * 1000)));
  } else if (diff >= 1000 * 60 * 60 * 24 && diff < 1000 * 60 * 60 * 24 * 31) { // 大于1天,小于31天
    return unit ? Math.floor((diff) / (24 * 60 * 60 * 1000)) + 'day' : String(Math.floor((diff) / (24 * 60 * 60 * 1000 * 1000)));
  } else if (diff >= 1000 * 60 * 60 * 24 * 31 && diff < 1000 * 60 * 60 * 24 * 365) { // 大于31天,小于365天
    return unit ? ((diff) / (30 * 24 * 60 * 60 * 1000)).toFixed(2) + 'month' : ((diff) / (30 * 24 * 60 * 60 * 1000)).toFixed(2);
  } else { // 大于365天
    return unit ? ((diff) / (365 * 24 * 60 * 60 * 1000)).toFixed(2) + 'year' : ((diff) / (365 * 24 * 60 * 60 * 1000)).toFixed(2);
  }
}