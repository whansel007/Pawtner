import { getDayPhase, type DayPhase } from "../../../shared/day-phase.js";

/**
 * Pure rule for which garden to show: the Settings demo clock wins; otherwise the real clock.
 * An unknown timezone (Intl throws) falls back to `fallback` rather than breaking the scene.
 * Kept free of React and mobile config so unit tests can import it directly.
 */
export function resolveDayPhase(demoNow: string | null, now: Date, timezone: string, fallback: DayPhase): DayPhase {
  try {
    return getDayPhase(demoNow ?? now.toISOString(), timezone);
  } catch {
    return fallback;
  }
}
