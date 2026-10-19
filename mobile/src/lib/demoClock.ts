import { DEMO_CLOCK_STORAGE_KEY } from "../config/demo.js";
import { browserStore, readItem, removeItem, writeItem, type KeyValueStore } from "./localStore.js";

/**
 * The phone's demo clock (Settings > For demo only > Current Time of Demo, or Reset to morning). It runs forward from
 * the moment it was set, like a real clock (user, 16 Oct: the clock must reach a dose time so the reminder fires).
 * Shared with /care in the same browser so Jamie's page shows Buddy at the same moment as Rose's phone. null = real time.
 * Demo only: like restock help, a /care page in another browser stays on real time.
 */
export interface DemoClockAnchor {
  /** The time the clock was set to. */
  at: string;
  /** When (real time, ms) it was set. */
  setAtMs: number;
}

/** The demo clock's time now: the time it was set to plus the real time since; null when there is no demo clock. */
export function runningClock(anchor: DemoClockAnchor | null, nowMs: number = Date.now()): string | null {
  if (!anchor) return null;
  return new Date(Date.parse(anchor.at) + Math.max(0, nowMs - anchor.setAtMs)).toISOString();
}

export function saveDemoClock(anchor: DemoClockAnchor | null, store: KeyValueStore | null = browserStore()): void {
  if (anchor) writeItem(DEMO_CLOCK_STORAGE_KEY, JSON.stringify(anchor), store);
  else removeItem(DEMO_CLOCK_STORAGE_KEY, store);
}

/** The shared demo clock's time now (running), or null. An older plain instant reads as a clock set just now. */
export function readDemoClock(store: KeyValueStore | null = browserStore(), nowMs: number = Date.now()): string | null {
  const raw = readItem(DEMO_CLOCK_STORAGE_KEY, store);
  if (!raw) return null;
  if (Number.isFinite(Date.parse(raw))) return runningClock({ at: raw, setAtMs: nowMs }, nowMs);
  try {
    const parsed = JSON.parse(raw) as Partial<DemoClockAnchor>;
    if (typeof parsed.at !== "string" || !Number.isFinite(Date.parse(parsed.at)) || typeof parsed.setAtMs !== "number") return null;
    return runningClock({ at: parsed.at, setAtMs: parsed.setAtMs }, nowMs);
  } catch {
    return null;
  }
}

/**
 * What the phone does with the demo clock when it opens (owner: the demo keeps its state). A `?clock=` link (Reset to
 * morning reloads with one, or a shared demo link) wins and is written to the server; otherwise the phone adopts the
 * server's clock (set from any browser) and writes nothing, so opening the app never wipes the demo's time.
 * After that the phone writes only on an explicit change (Settings "Jump to this time").
 */
export function demoClockOnLoad(fromLink: string | null): { action: "write"; at: string } | { action: "adopt" } {
  return fromLink ? { action: "write", at: fromLink } : { action: "adopt" };
}

/**
 * The address bar's query without `param` (other params kept, "" when none are left). Once a `?clock=` link has been
 * written to the server on load, it is removed, so a later reload adopts the server's running clock instead of
 * setting it back.
 */
export function searchWithout(search: string, param: string): string {
  const params = new URLSearchParams(search);
  params.delete(param);
  const rest = params.toString();
  return rest ? `?${rest}` : "";
}
