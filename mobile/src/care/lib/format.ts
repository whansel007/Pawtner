/**
 * Date and time wording for /care via Intl. The API has no senior time zone yet,
 * so times use the viewer's local zone unless one is passed.
 */

export function formatMomentTime(iso: string, locale: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "short", hour: "numeric", minute: "2-digit", timeZone }).format(new Date(iso));
}

export function formatWeekday(date: Date | string, locale: string, width: "long" | "short" | "narrow" = "long", timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: width, timeZone }).format(new Date(date));
}
