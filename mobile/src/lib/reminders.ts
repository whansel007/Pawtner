import { REMINDERS_PARTS, type RemindersParts } from "../config/reminders.js";
import type { Screen } from "../types/common.js";

/** What Gentle reminders shows, by the screen it was opened from (config/reminders.ts REMINDERS_PARTS). */
export function remindersParts(openedFrom: Screen | null): RemindersParts {
  return (openedFrom && REMINDERS_PARTS.byWayIn[openedFrom]) || REMINDERS_PARTS.default;
}
