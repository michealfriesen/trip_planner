import type opening_hours from "opening_hours";
import type { Interval } from "@/lib/planner/types";

const MINUTES_PER_DAY = 24 * 60;

/** `days` consecutive dates from `start`, as 'YYYY-MM-DD'. Calendar maths in UTC, so clock changes don't matter. */
export function tripDates(start: string, days: number): string[] {
  const [y, m, d] = start.split("-").map(Number);
  return Array.from({ length: days }, (_, i) => new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10));
}

/** 'HH:mm' → minutes after midnight. */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Minutes after midnight → 'HH:mm'. 1440 is '24:00'. */
export function fromMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * A `Date` for a wall-clock time on a date, built with local-time methods, as opening_hours.js reads them.
 * Going in and out through the same local methods cancels out the server's time zone.
 */
export function localDate(date: string, minutes: number): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, 0, minutes);
}

function minutesInto(date: string, at: Date): number {
  const sameDay =
    at.getFullYear() === Number(date.slice(0, 4)) &&
    at.getMonth() + 1 === Number(date.slice(5, 7)) &&
    at.getDate() === Number(date.slice(8, 10));
  return sameDay ? at.getHours() * 60 + at.getMinutes() : MINUTES_PER_DAY;
}

/**
 * Opening intervals on `date`, clipped to the daily window. Intervals the library marks "unknown" count as open
 * and are flagged so the stop can carry a warning.
 */
export function openIntervals(oh: opening_hours, date: string, windowStart: number, windowEnd: number): Interval[] {
  const from = localDate(date, 0);
  const to = localDate(date, MINUTES_PER_DAY);
  const result: Interval[] = [];
  for (const [open, close, unknown] of oh.getOpenIntervals(from, to)) {
    const start = Math.max(minutesInto(date, open), windowStart);
    const end = Math.min(minutesInto(date, close), windowEnd);
    if (end > start) result.push(unknown ? { start, end, unknown: true } : { start, end });
  }
  return result;
}
