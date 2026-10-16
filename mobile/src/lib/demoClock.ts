import { DEMO_CLOCK_STORAGE_KEY } from "../config/demo.js";
import { browserStore, readItem, removeItem, writeItem, type KeyValueStore } from "./localStore.js";

/**
 * The phone's agent clock (Settings > For demo only > Agent clock, or Reset to morning), shared with /care in the
 * same browser so Jamie's page shows Buddy at the same moment as Rose's phone (user, 16 Oct). null = real time.
 * Demo only: like restock help, a /care page in another browser stays on real time.
 */
export function saveDemoClock(instant: string | null, store: KeyValueStore | null = browserStore()): void {
  if (instant) writeItem(DEMO_CLOCK_STORAGE_KEY, instant, store);
  else removeItem(DEMO_CLOCK_STORAGE_KEY, store);
}

export function readDemoClock(store: KeyValueStore | null = browserStore()): string | null {
  const value = readItem(DEMO_CLOCK_STORAGE_KEY, store);
  return value && Number.isFinite(Date.parse(value)) ? value : null;
}
