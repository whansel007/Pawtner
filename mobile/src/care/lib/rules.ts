import { DEMO_RULES } from "../../../../shared/config.js";
import type { DerivedDose } from "../../../../shared/contract.js";
import type { CaringMoment } from "../data/types.js";

/**
 * Caretaker web rules (pure, no React or DOM), shared by the pages and the unit tests.
 * Every "who sees what" and "what number shows" rule for /care lives here, not in components.
 */

export const STREAK_WINDOW_DAYS = 7;
export const MIN_CHECK_IN_THRESHOLD = DEMO_RULES.caretakerMinimumThreshold;

/** One flag per day, oldest first, ending yesterday (see recentDays): the last min(streak, days) days are filled, so filled hearts = streak. */
export function streakHearts(streak: number, days: number = STREAK_WINDOW_DAYS): boolean[] {
  const filled = Number.isFinite(streak) ? Math.min(Math.max(Math.floor(streak), 0), days) : 0;
  return Array.from({ length: days }, (_, index) => index >= days - filled);
}

/**
 * The calendar days the streak hearts stand for, oldest first, ending on the day BEFORE `now`: the streak
 * (shared/selectors computeStreak) only counts finished days, so today never has a streak heart. Today has its
 * own card on This week.
 */
export function recentDays(now: Date, days: number = STREAK_WINDOW_DAYS): Date[] {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(now);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (days - index));
    return date;
  });
}

export interface TodayProgress {
  done: number;
  total: number;
  missed: number;
}

/** Counts only; caretaker pages never show which medicine (PRD §11). */
export function todayProgress(doses: readonly Pick<DerivedDose, "status">[]): TodayProgress {
  return {
    done: doses.filter((dose) => dose.status === "taken").length,
    total: doses.length,
    missed: doses.filter((dose) => dose.status === "missed").length,
  };
}

export type TodayState = "none" | "allDone" | "missed" | "onTrack";

export function todayState(progress: TodayProgress): TodayState {
  if (progress.total === 0) return "none";
  if (progress.done === progress.total) return "allDone";
  if (progress.missed > 0) return "missed";
  return "onTrack";
}

/** Share of today's doses taken, 0–100, for the progress ring. */
export function progressPercent(progress: TodayProgress): number {
  return progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100);
}

/** Updates-only caretakers see caring moments but not check-in alerts. */
export function visibleMoments(moments: readonly CaringMoment[], viewer: { receivesCheckIns: boolean }): CaringMoment[] {
  return viewer.receivesCheckIns ? [...moments] : moments.filter((moment) => moment.kind !== "check_in");
}

export type CheckInLock = "updatesOnly" | "noConsent" | "offline";

/**
 * Whether this viewer may change the shared check-in threshold, and if not, why (first reason wins).
 * Only check-ins caretakers edit; nothing to tune until the senior has opted in; saving needs the API.
 */
export function checkInLock(input: { receivesCheckIns: boolean; optedIn: boolean; offline: boolean }): CheckInLock | null {
  if (!input.receivesCheckIns) return "updatesOnly";
  if (!input.optedIn) return "noConsent";
  if (input.offline) return "offline";
  return null;
}

/** Next threshold after a stepper press; never below the minimum enforced by the database. */
export function stepThreshold(current: number, delta: number): number {
  return Math.max(MIN_CHECK_IN_THRESHOLD, current + delta);
}

export function canDecreaseThreshold(current: number): boolean {
  return current > MIN_CHECK_IN_THRESHOLD;
}

/** First letter of a name for avatars, any script; "?" for an empty name. */
export function initialOf(name: string): string {
  const first = Array.from(name.trim())[0];
  return first ? first.toLocaleUpperCase() : "?";
}
