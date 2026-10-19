import type { Screen } from "../types/common.js";

/**
 * Dose-time reminder on Rose's phone (user, 16 Oct): when the clock (the running demo clock, or real time) reaches a
 * saved dose time and that dose isn't taken, Buddy barks once and a toast says it's time for her medicine. Once per
 * dose. It lasts until the first nudge would be due (DEMO_RULES.nudgeDelayMinutes); the agent's nudges are unchanged.
 */
export const DOSE_REMINDER = {
  /** How often the phone compares the clock with today's dose times. */
  checkEveryMs: 5_000,
  /** localStorage key: the reminders already given (one key per dose occurrence), so a reload doesn't repeat them. */
  storageKey: "pawtner.doseReminders",
} as const;

/** The parts of Gentle reminders (screens/RemindersScreen.tsx) that depend on the way in. */
export type RemindersParts = { nextDose: boolean };

/**
 * One screen, two ways in (owner, 19 Oct): from Home (Today chip, "See all") it shows the next dose; from Settings
 * ("Buddy's nudges") it doesn't. Keyed by the screen it was opened from; anything else uses `default`.
 */
export const REMINDERS_PARTS = {
  default: { nextDose: true },
  byWayIn: { settings: { nextDose: false } } as Partial<Record<Screen, RemindersParts>>,
} as const;
