import { DEMO_RULES } from "../../../shared/config.js";
import type { DerivedDose } from "../../../shared/contract.js";
import { DOSE_REMINDER } from "../config/reminders.js";
import { browserStore, readItem, writeItem, type KeyValueStore } from "./localStore.js";

/** One key per dose occurrence (schedule + scheduled time), so each dose is reminded once. */
export function reminderKey(dose: Pick<DerivedDose, "id" | "scheduledAt">): string {
  return `${dose.id}|${Date.parse(dose.scheduledAt)}`;
}

/**
 * Doses due a reminder at `nowMs`: not taken or skipped, their time has come, the first nudge isn't due yet
 * (`DEMO_RULES.nudgeDelayMinutes`), and not reminded before. The time comes from each dose's saved schedule.
 */
export function dosesDueForReminder(doses: readonly DerivedDose[], nowMs: number, given: ReadonlySet<string>): DerivedDose[] {
  const windowMs = DEMO_RULES.nudgeDelayMinutes * 60_000;
  return doses.filter((dose) => {
    if (dose.status === "taken" || dose.status === "skipped") return false;
    const dueMs = Date.parse(dose.scheduledAt);
    return nowMs >= dueMs && nowMs < dueMs + windowMs && !given.has(reminderKey(dose));
  });
}

export function readGivenReminders(store: KeyValueStore | null = browserStore()): Set<string> {
  try {
    const parsed: unknown = JSON.parse(readItem(DOSE_REMINDER.storageKey, store) ?? "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === "string") : []);
  } catch {
    return new Set();
  }
}

/** Saves the given reminders, keeping only the newest 50 so the list never grows without end. */
export function writeGivenReminders(given: ReadonlySet<string>, store: KeyValueStore | null = browserStore()): void {
  writeItem(DOSE_REMINDER.storageKey, JSON.stringify([...given].slice(-50)), store);
}
