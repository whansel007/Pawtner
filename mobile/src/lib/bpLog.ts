import type { HealthMetric } from "../../../shared/contract.js";
import { bloodPressureProgress } from "../../../shared/rules.js";

/**
 * The blood-pressure log (pure, no React): her readings grouped by the senior's local day, newest day first and newest
 * reading first in each day, each day marked today / yesterday / earlier for its heading.
 */
export interface BpLogDay {
  /** YYYY-MM-DD in the senior's zone. */
  day: string;
  when: "today" | "yesterday" | "earlier";
  readings: HealthMetric[];
}

function localDay(instant: string | number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(instant));
}

export function groupReadingsByDay(readings: readonly HealthMetric[], now: string, timeZone: string): BpLogDay[] {
  const today = localDay(now, timeZone);
  const yesterday = localDay(Date.parse(`${today}T12:00:00Z`) - 86_400_000, "UTC");
  const days = new Map<string, HealthMetric[]>();
  for (const reading of [...readings].sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt))) {
    const day = localDay(reading.recordedAt, timeZone);
    days.set(day, [...(days.get(day) ?? []), reading]);
  }
  return [...days.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([day, items]) => ({ day, when: day === today ? "today" : day === yesterday ? "yesterday" : "earlier", readings: items }));
}

/**
 * A log card's one second line (owner, 18 Oct: "either i feel fine, or higher bp or some other conditions checked. no
 * need to interpret"): for a reading higher than her first, the line "higher than your first reading" (en.json key)
 * and then her note; otherwise only her note as written (ticked feelings or conditions). Nothing else.
 */
export function logSecondLine(reading: HealthMetric, first: HealthMetric | null): { reasonKey: string | null; note: string | null } {
  const note = reading.note?.trim() ? reading.note.trim() : null;
  const higher = bloodPressureProgress(reading, first) === "warning";
  return { reasonKey: higher ? "health.bpProgress.warning" : null, note };
}

/** An earlier day's heading, e.g. "Mon 13 Oct" (`day` is YYYY-MM-DD). */
export function formatLogDay(day: string, locale: string): string {
  const parts = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .formatToParts(new Date(`${day}T12:00:00Z`));
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("weekday")} ${part("day")} ${part("month")}`;
}

/** A reading's time in the senior's zone, e.g. "9:05 AM". */
export function formatLogTime(instant: string, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", hour12: true, timeZone }).format(new Date(instant));
}
