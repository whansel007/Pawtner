/**
 * The doctor's next visit and the side-effect notes that count until it (owner, 19 Oct: "it should be until the
 * doctor's next visit"). Plain values only (dates as YYYY-MM-DD, instants as ISO), never a database row.
 */

/** The senior's local calendar day of an instant (YYYY-MM-DD). */
export function localDay(instant: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(instant));
}

/**
 * The next visit as seen from `day`: the saved date, or `day` itself when none is saved or the saved date has passed
 * (owner: "defaults to today unless changed", "passed date is counted as today"). One condition, worked out on read.
 */
export function effectiveNextVisit(saved: string | null, day: string): string {
  return saved !== null && saved >= day ? saved : day;
}

/** A note written on `noteDay` counts on `today` from that day until the end of its next-visit day. */
export function sideEffectNoteCounts(noteDay: string, today: string, saved: string | null): boolean {
  return noteDay <= today && today <= effectiveNextVisit(saved, noteDay);
}

/** A plain YYYY-MM-DD calendar date that exists (e.g. not 2026-02-30). */
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
