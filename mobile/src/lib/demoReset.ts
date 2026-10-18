import { CLINIC_MEMO, VISIT_NOTES } from "../config/health.js";
import { RESTOCK_STORAGE_KEYS } from "../config/restock.js";
import { SHARING } from "../config/sharing.js";
import { DEMO_CLOCK_STORAGE_KEY } from "../config/demo.js";
import { DOSE_REMINDER } from "../config/reminders.js";
import { browserStore, removeItem, type KeyValueStore } from "./localStore.js";
import { readClinicMemos, writeClinicMemos } from "./clinicMemo.js";
import { readVisitNotes, writeVisitNotes } from "./visitNotes.js";
import { resetItems, resetNotes } from "../../../shared/dayReset.js";
import { zonedDate, zonedTimeToInstant } from "./demoTime.js";

/**
 * What the phone app keeps in localStorage for the demo and Reset to morning clears whole. Add a key here when a
 * feature stores one. Visit notes and clinic memo photos are not cleared: only the reset day's are hidden
 * (resetDemoStorage). Saved doses, readings and walks live in the API.
 */
export const DEMO_STORAGE_KEYS: readonly string[] = [
  ...Object.values(RESTOCK_STORAGE_KEYS),
  SHARING.bloodPressureKey,
  DEMO_CLOCK_STORAGE_KEY,
  // Reset to morning gives today's dose-time reminders again.
  DOSE_REMINDER.storageKey,
  // Written by earlier builds ("I'll get it myself" used to hide the card for the day).
  "pawtner.restockDismissedOn",
];

/**
 * Reset to morning on this phone: clears the demo keys, and hides today's visit notes, wordings and clinic memo photos
 * (today = from local midnight in `timeZone`, the senior's, same day as the server's reset; shared/dayReset.ts).
 * Earlier ones stay.
 */
export function resetDemoStorage(timeZone: string, store: KeyValueStore | null = browserStore(), now: Date = new Date()): void {
  DEMO_STORAGE_KEYS.forEach((key) => removeItem(key, store));
  const dayStart = zonedTimeToInstant(zonedDate(now, timeZone), { hour: 0, minute: 0 }, timeZone).getTime();
  const stampedAt = now.toISOString();
  const notes = readVisitNotes(VISIT_NOTES.storageKey, store);
  if (notes.length) writeVisitNotes(VISIT_NOTES.storageKey, resetNotes(notes, dayStart, stampedAt), store);
  const photos = readClinicMemos(CLINIC_MEMO.storageKey, store);
  if (photos.length) writeClinicMemos(CLINIC_MEMO.storageKey, resetItems(photos, (photo) => photo.addedAt, dayStart, stampedAt), store);
}
