import { SHARING } from "../config/sharing.js";
import { browserStore, readItem, writeItem, type KeyValueStore } from "./localStore.js";

/**
 * "Share my blood pressure with {{caretaker}}" (pure helpers). When on, /care shows the latest reading and
 * the questions written with readings. The server keeps the switch and enforces it (GET / PUT /api/sharing,
 * migration 008); this is the phone's local copy (useSharing.ts).
 */
export function readShareBloodPressure(store: KeyValueStore | null = browserStore()): boolean {
  const raw = readItem(SHARING.bloodPressureKey, store);
  return raw === null ? SHARING.bloodPressureDefault : raw === "true";
}

/** True when stored; false means the choice lasts only this session. */
export function writeShareBloodPressure(value: boolean, store: KeyValueStore | null = browserStore()): boolean {
  return writeItem(SHARING.bloodPressureKey, String(value), store);
}
