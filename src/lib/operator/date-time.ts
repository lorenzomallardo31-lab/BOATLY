const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-\d{2}$/;
const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export function isDateKey(value: string | undefined): value is string {
  if (!value || !DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isMonthKey(value: string | undefined): value is string {
  if (!value || !MONTH_PATTERN.test(value)) return false;
  const [year, month] = value.split("-").map(Number);
  return year >= 2000 && year <= 2100 && month >= 1 && month <= 12;
}

export function addDays(dateKey: string, amount: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return date.toISOString().slice(0, 10);
}

export function addMonths(monthKey: string, amount: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));
  return date.toISOString().slice(0, 7);
}

export function dateKeyInTimeZone(value: Date | string, timezone: string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const record = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${record.year}-${record.month}-${record.day}`;
}

export function todayInTimeZone(timezone: string) {
  return dateKeyInTimeZone(new Date(), timezone);
}

export function localDateTimeInTimeZone(value: Date | string, timezone: string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const record = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${record.year}-${record.month}-${record.day}T${record.hour}:${record.minute}`;
}

function offsetAt(instant: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const record = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const representedAsUtc = Date.UTC(
    Number(record.year),
    Number(record.month) - 1,
    Number(record.day),
    Number(record.hour),
    Number(record.minute),
    Number(record.second),
  );
  return representedAsUtc - instant.getTime();
}

export function zonedDateTimeToIso(localValue: string, timezone: string) {
  const match = LOCAL_DATE_TIME_PATTERN.exec(localValue);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const naiveUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );
  const firstGuess = new Date(naiveUtc);
  const adjusted = new Date(naiveUtc - offsetAt(firstGuess, timezone));
  const final = new Date(naiveUtc - offsetAt(adjusted, timezone));

  if (
    localDateTimeInTimeZone(final, timezone) !==
    `${year}-${month}-${day}T${hour}:${minute}`
  ) {
    return null;
  }

  return final.toISOString();
}

export function zonedDayBounds(dateKey: string, timezone: string) {
  if (!isDateKey(dateKey)) return null;
  const start = zonedDateTimeToIso(`${dateKey}T00:00`, timezone);
  const end = zonedDateTimeToIso(`${addDays(dateKey, 1)}T00:00`, timezone);
  return start && end ? { start, end } : null;
}

export function zonedMonthBounds(monthKey: string, timezone: string) {
  if (!isMonthKey(monthKey)) return null;
  const startDate = `${monthKey}-01`;
  const endDate = `${addMonths(monthKey, 1)}-01`;
  const start = zonedDateTimeToIso(`${startDate}T00:00`, timezone);
  const end = zonedDateTimeToIso(`${endDate}T00:00`, timezone);
  return start && end ? { start, end } : null;
}
