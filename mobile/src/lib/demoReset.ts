import { CLINIC_MEMO, VISIT_NOTES } from "../config/health.js";
import { RESTOCK_STORAGE_KEYS } from "../config/restock.js";
import { SHARING } from "../config/sharing.js";
import { DEMO_CLOCK_STORAGE_KEY } from "../config/demo.js";
import { browserStore, removeItem, type KeyValueStore } from "./localStore.js";

/**
 * Everything the phone app keeps in localStorage for the demo. Add a key here when a feature stores one,
 * so "Reset demo" in Settings clears it. Saved doses, readings and walks live in the API and are not touched.
 */
export const DEMO_STORAGE_KEYS: readonly string[] = [
  ...Object.values(RESTOCK_STORAGE_KEYS),
  CLINIC_MEMO.storageKey,
  VISIT_NOTES.storageKey,
  SHARING.bloodPressureKey,
  DEMO_CLOCK_STORAGE_KEY,
  // Written by earlier builds ("I'll get it myself" used to hide the card for the day).
  "pawtner.restockDismissedOn",
];

/** Clears this phone's demo choices (restock, clinic memo photo, visit notes). */
export function resetDemoStorage(store: KeyValueStore | null = browserStore()): void {
  DEMO_STORAGE_KEYS.forEach((key) => removeItem(key, store));
}
