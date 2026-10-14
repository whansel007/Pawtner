/**
 * T2-10: Sun/moon chosen by one shared helper based on local time.
 * No timezone assumptions beyond the user's configured timezone.
 */

export type DayPhase = "day" | "night";

/**
 * Returns "day" or "night" based on the hour of the day in the user's timezone.
 * Day is 7:00–18:59, night is 19:00–6:59 (Singapore-appropriate).
 */
export function getDayPhase(now: string, timezone: string): DayPhase {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date(now));
  const hourPart = parts.find((p) => p.type === "hour");
  const hour = hourPart ? Number(hourPart.value) : 12;
  return hour >= 7 && hour < 19 ? "day" : "night";
}
