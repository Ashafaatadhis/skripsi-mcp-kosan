const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toUtcDate = (value: Date | string) => {
  const date = typeof value === "string" ? new Date(value) : new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const getLastDayOfMonthUtc = (year: number, monthIndex: number) =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

export const addDaysUtc = (value: Date | string, days: number) => {
  const date = toUtcDate(value);
  return new Date(date.getTime() + days * MS_PER_DAY);
};

export const addMonthsClampedUtc = (value: Date | string, months: number) => {
  const date = toUtcDate(value);
  const year = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth();
  const day = date.getUTCDate();

  const targetMonthIndex = monthIndex + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonthIndex = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = getLastDayOfMonthUtc(targetYear, normalizedMonthIndex);
  const targetDay = Math.min(day, lastDay);

  return new Date(Date.UTC(targetYear, normalizedMonthIndex, targetDay));
};

export const getPeriodEndUtc = (periodStart: Date | string, monthsPaid: number) =>
  addDaysUtc(addMonthsClampedUtc(periodStart, monthsPaid), -1);

export const getNextPeriodStartUtc = (startDate: Date | string, paidUntil?: Date | string | null) =>
  paidUntil ? addDaysUtc(paidUntil, 1) : toUtcDate(startDate);

export const toDateOnlyIso = (value: Date | string | null | undefined) => {
  if (!value) return null;
  return toUtcDate(value).toISOString().slice(0, 10);
};
