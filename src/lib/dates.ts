/**
 * Class dates are calendar dates (Postgres `date`), stored as UTC midnight.
 * "Today" is resolved in the college's timezone so a lesson at 09:00 local
 * time is "today" regardless of the server's timezone.
 */
export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "Asia/Almaty";

export function todayISO(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isoToDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function dateToISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayDate(): Date {
  return isoToDate(todayISO());
}

export function addDaysISO(iso: string, days: number): string {
  const d = isoToDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return dateToISO(d);
}

const longFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" });
const weekdayFmt = new Intl.DateTimeFormat("ru-RU", { weekday: "long", timeZone: "UTC" });
const shortFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" });

/** "6 октября" */
export function formatDay(d: Date) {
  return longFmt.format(d);
}

/** "понедельник" */
export function formatWeekday(d: Date) {
  return weekdayFmt.format(d);
}

/** "6 окт." */
export function formatDayShort(d: Date) {
  return shortFmt.format(d);
}

export function relativeDay(d: Date): string {
  const today = todayISO();
  const iso = dateToISO(d);
  if (iso === today) return "Сегодня";
  if (iso === addDaysISO(today, 1)) return "Завтра";
  if (iso === addDaysISO(today, -1)) return "Вчера";
  return formatDay(d);
}

export function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: APP_TIMEZONE,
  }).format(d);
}
