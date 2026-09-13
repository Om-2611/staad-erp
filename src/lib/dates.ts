import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  parseISO,
  differenceInMinutes,
} from "date-fns";

/** Today's date as YYYY-MM-DD, matching Postgres `date` columns. */
export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function toISODate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function formatDate(iso: string): string {
  return format(parseISO(iso), "d MMM yyyy");
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return format(new Date(iso), "d MMM yyyy, h:mm a");
}

export function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return format(new Date(iso), "h:mm a");
}

/** Monday-start week range containing the given date (defaults to today). */
export function currentWeekRange(reference = new Date()) {
  const start = startOfWeek(reference, { weekStartsOn: 1 });
  const end = endOfWeek(reference, { weekStartsOn: 1 });
  return { start: toISODate(start), end: toISODate(end) };
}

export function currentMonthRange(reference = new Date()) {
  const start = startOfMonth(reference);
  const end = endOfMonth(reference);
  return { start: toISODate(start), end: toISODate(end) };
}

export function daysInRange(startISO: string, endISO: string): string[] {
  return eachDayOfInterval({ start: parseISO(startISO), end: parseISO(endISO) }).map(toISODate);
}

export function minutesToLabel(minutes: number | null): string {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function durationMinutes(checkIn: string | null, checkOut: string | null): number | null {
  if (!checkIn || !checkOut) return null;
  return differenceInMinutes(new Date(checkOut), new Date(checkIn));
}
