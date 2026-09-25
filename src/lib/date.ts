import type { DayIndex } from "./types";

export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dayIndexOf(d: Date = new Date()): DayIndex {
  return d.getDay() as DayIndex;
}

// Sunday as start of week -> returns dateKey of the Sunday for the given date
export function weekStartKey(d: Date = new Date()): string {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return dateKey(copy);
}

export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function nowMinutes(d: Date = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function formatTimeRange(start: string, end: string): string {
  if (!end || end === start) return start;
  return `${start}–${end}`;
}

export function humanMinutes(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function greeting(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export type RecurrenceKind = "none" | "daily" | "weekly" | "monthly";

/** Advances an ISO "YYYY-MM-DD" date forward by one recurrence interval. */
export function advanceDate(iso: string, kind: RecurrenceKind): string {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  if (kind === "daily") d.setDate(d.getDate() + 1);
  else if (kind === "weekly") d.setDate(d.getDate() + 7);
  else if (kind === "monthly") d.setMonth(d.getMonth() + 1);
  return dateKey(d);
}
