/**
 * Pure date/time helpers for the demo clock: parse a `?time=` value and turn "today at HH:MM in a timezone"
 * into a UTC instant. No React and no mobile config imports, so unit tests can import it directly.
 */

export type ClockTime = { hour: number; minute: number };
export type CalendarDate = { year: number; month: number; day: number };

/** 24-hour "H:MM" or "HH:MM". */
const HH_MM = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/**
 * Parses a demo time: a preset name (case-insensitive, e.g. "morning") or a 24-hour "HH:MM".
 * Returns null for anything else (empty, "25:00", "9", "21:00:00", unknown names).
 */
export function parseDemoTime(value: string | null | undefined, presets: Readonly<Record<string, string>>): ClockTime | null {
  if (value == null) return null;
  const raw = value.trim();
  const name = raw.toLowerCase();
  const text = Object.prototype.hasOwnProperty.call(presets, name) ? presets[name] : raw;
  const match = HH_MM.exec(text);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

/** "9:00", "21:00": for button labels. */
export function formatClockTime({ hour, minute }: ClockTime): string {
  return `${hour}:${String(minute).padStart(2, "0")}`;
}

/** Wall-clock parts of an instant in a timezone. Throws RangeError for an unknown timezone. */
function zonedParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

/** The timezone's offset from UTC at an instant, in ms (Singapore: +8 h). */
function zoneOffsetMs(instantMs: number, timeZone: string): number {
  const wholeSecond = instantMs - (((instantMs % 1000) + 1000) % 1000);
  const p = zonedParts(new Date(wholeSecond), timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - wholeSecond;
}

/** The calendar date it is in `timeZone` at `instant` (may differ from the device's date). */
export function zonedDate(instant: Date, timeZone: string): CalendarDate {
  const { year, month, day } = zonedParts(instant, timeZone);
  return { year, month, day };
}

/**
 * The UTC instant when the wall clock in `timeZone` shows `date` at `time`.
 * Re-checks the offset at the result, so daylight-saving zones get the offset in force on that date.
 */
export function zonedTimeToInstant(date: CalendarDate, time: ClockTime, timeZone: string): Date {
  const wallAsUtc = Date.UTC(date.year, date.month - 1, date.day, time.hour, time.minute);
  const first = wallAsUtc - zoneOffsetMs(wallAsUtc, timeZone);
  const second = wallAsUtc - zoneOffsetMs(first, timeZone);
  return new Date(second);
}

/** ISO instant for "today in `timeZone`, at `time`". */
export function demoInstantToday(time: ClockTime, now: Date, timeZone: string): string {
  return zonedTimeToInstant(zonedDate(now, timeZone), time, timeZone).toISOString();
}

/**
 * Reads the `?time=` parameter from a location search string.
 * demoNow: the ISO instant to use, or null when the parameter is absent or invalid.
 * rejected: the raw value when it was present but invalid (or the timezone is unknown), for one console warning.
 */
export function demoNowFromSearch(
  search: string,
  param: string,
  presets: Readonly<Record<string, string>>,
  now: Date,
  timeZone: string,
): { demoNow: string | null; rejected: string | null } {
  const value = new URLSearchParams(search).get(param);
  if (value === null) return { demoNow: null, rejected: null };
  const time = parseDemoTime(value, presets);
  if (!time) return { demoNow: null, rejected: value };
  try {
    return { demoNow: demoInstantToday(time, now, timeZone), rejected: null };
  } catch {
    return { demoNow: null, rejected: value };
  }
}

/** Value for an <input type="datetime-local">: the instant in the DEVICE's local time (what the input shows and parses). */
export function toDateTimeLocal(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
