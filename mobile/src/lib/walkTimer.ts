/**
 * Start walk's live timer (pure). The phone has no step counter or GPS, so a real walk shows only its time:
 * whole seconds from the walk's start to now, both on the app's clock (the running demo clock, or real time).
 */

/** Shown for what a real walk can't measure (distance, steps, calories, speed). */
export const NOT_MEASURED = "—";

/** How often the timer on screen re-reads the clock (real milliseconds). */
export const WALK_TIMER_TICK_MS = 1000;

/** Whole seconds from `startedAt` to `now` (ISO strings); 0 before the start or if either time is unreadable. */
export function elapsedSeconds(startedAt: string, now: string): number {
  const ms = Date.parse(now) - Date.parse(startedAt);
  return Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 1000) : 0;
}

/** mm:ss (minutes keep counting past 59, e.g. "75:03"). */
export function formatDuration(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
