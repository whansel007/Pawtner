import { DEMO_RULES } from "../../../../shared/config.js";
import type { CaretakerSummaryResponse, DerivedDose, HeartActivities } from "../../../../shared/contract.js";
import { countActivitiesDone } from "../../../../shared/selectors.js";
import type { CaringMoment } from "../data/types.js";
import { zonedDate } from "../../lib/demoTime.js";
import type { RestockHelpEntry } from "../../lib/restockHelp.js";

/**
 * Caretaker web rules (pure, no React or DOM), shared by the pages and the unit tests.
 * Every "who sees what" and "what number shows" rule for /care lives here, not in components.
 */

export const STREAK_WINDOW_DAYS = 7;
/** "A lovely rhythm": a day's heart is filled when Buddy ended that day on at least this many hearts (user, 16 Oct; demo). */
export const RHYTHM_MIN_HEARTS = 2;

/** A date as "YYYY-MM-DD" in the viewer's own calendar. */
function localKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * The rhythm card's week (user, 16 Oct): Sunday to Saturday of the week containing `now`. A day before today is filled
 * when Buddy ended it on RHYTHM_MIN_HEARTS or more (`dayHearts` from the summary); today and later are not yet.
 */
export function weekRhythm(now: Date, dayHearts: ReadonlyArray<{ date: string; hearts: number }>): Array<{ date: Date; filled: boolean }> {
  const hearts = new Map(dayHearts.map((day) => [day.date, day.hearts]));
  const today = localKey(now);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - date.getDay() + index);
    const key = localKey(date);
    return { date, filled: key < today && (hearts.get(key) ?? 0) >= RHYTHM_MIN_HEARTS };
  });
}
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

/**
 * Today's three heart activities (all medicines, a measurement, a walk; user, 16 Oct): how many are done, out of how
 * many, and how many doses were missed. Counts only; caretaker pages never show which medicine (PRD §11).
 */
export function todayProgress(activities: HeartActivities, doses: readonly Pick<DerivedDose, "status">[]): TodayProgress {
  return {
    done: countActivitiesDone(activities),
    total: Object.keys(activities).length,
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

/**
 * "A medicine is stopped." card: the senior's calendar day ("YYYY-MM-DD") of the latest stop this week, or null for no card.
 * Shown to every signed-in caretaker; the API never sends the medicine's name or a count.
 */
export function stoppedMedicineDay(stopped: { stoppedAt: string } | null, timeZone: string): string | null {
  if (!stopped) return null;
  const { year, month, day } = zonedDate(new Date(stopped.stoppedAt), timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** One row of the "{{dog}}'s updates" card on This week. `at` (ISO) orders the rows, newest first. */
export type CareUpdate =
  | { kind: "checkIn"; at: string; checkIn: NonNullable<CaretakerSummaryResponse["checkIn"]> }
  | { kind: "stopped"; at: string }
  | { kind: "refill"; at: string; request: RestockHelpEntry }
  | { kind: "refillHandled"; at: string };

/**
 * The rows of the one "{{dog}}'s updates" card, newest first; empty = no card.
 * Check-ins only for caretakers who get them; a stopped medicine never carries its name;
 * the refill request (one at a time, demo: lib/restockHelp.ts) is pending, or handled at `handledRestockAt`.
 */
export function careUpdates(
  summary: Pick<CaretakerSummaryResponse, "checkIn" | "stoppedMedicine">,
  viewer: { receivesCheckIns: boolean },
  restockRequest: RestockHelpEntry | null,
  handledRestockAt: string | null,
): CareUpdate[] {
  const updates: CareUpdate[] = [];
  if (viewer.receivesCheckIns && summary.checkIn) updates.push({ kind: "checkIn", at: summary.checkIn.sentAt, checkIn: summary.checkIn });
  if (summary.stoppedMedicine) updates.push({ kind: "stopped", at: summary.stoppedMedicine.stoppedAt });
  if (restockRequest) updates.push({ kind: "refill", at: restockRequest.requestedAt, request: restockRequest });
  else if (handledRestockAt) updates.push({ kind: "refillHandled", at: handledRestockAt });
  return updates.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}
