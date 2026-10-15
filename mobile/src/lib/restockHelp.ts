import { RESTOCK_STORAGE_KEYS } from "../config/restock.js";
import { browserStore, readItem, removeItem, writeItem, type KeyValueStore } from "./localStore.js";

/**
 * Restock help: the senior asks her caretaker to help with a medicine refill.
 *
 * DEMO ONLY, WIRE-READY. Today the request lives in localStorage (same origin, so /care open in the same
 * browser sees it). No database change. When P1 adds a table and endpoint, swap the bodies of
 * `requestRestockHelp`, `readRestockHelp` and `markRestockHelpHandled` for API calls; callers keep the same shapes.
 *
 * Privacy (user, 16 Oct): asking the caretaker for help shares that one medicine's name, so they know what to
 * buy; /care shows it with the days left. For a sensitive medicine the senior picks "I'll get it myself" and
 * nothing is sent.
 */

/**
 * What the phone sends. Proposed endpoint (not built):
 *   POST /api/restock-requests   body: RestockHelpRequest      → 201 RestockHelpEntry
 *   GET  /api/restock-requests?status=pending (for /care)      → RestockHelpEntry[] (no medicine names)
 *   POST /api/restock-requests/:id/handled                     → RestockHelpEntry
 * The server would add `id` and fill `status`/`handledAt`.
 */
export interface RestockHelpRequest {
  /** medications.id. */
  medicationId: string;
  /** The medicine to buy, shown on /care (shared only because the senior asked for help with it). */
  medicationName: string;
  /** Days of supply left when the senior asked. */
  daysLeft: number;
  /** ISO time the senior asked. */
  requestedAt: string;
}

export type RestockHelpStatus = "pending" | "handled";

/** A stored request: pending until a caretaker taps "I'll handle it". */
export interface RestockHelpEntry extends RestockHelpRequest {
  status: RestockHelpStatus;
  /** ISO time a caretaker said they'd handle it; null while pending. */
  handledAt: string | null;
}

function isEntry(value: unknown): value is RestockHelpEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.medicationId === "string" && typeof entry.medicationName === "string"
    && typeof entry.daysLeft === "number" && Number.isFinite(entry.daysLeft)
    && typeof entry.requestedAt === "string"
    && (entry.status === "pending" || entry.status === "handled")
    && (entry.handledAt === null || typeof entry.handledAt === "string");
}

/**
 * The one function the phone calls for "Ask {{caretaker}} to help".
 * TODO(P1 endpoint): replace the body with `return api.requestRestockHelp(request)` (POST /api/restock-requests).
 * If storage is blocked the entry is still returned, so the phone shows "asked" for this session.
 */
export async function requestRestockHelp(request: RestockHelpRequest, store: KeyValueStore | null = browserStore()): Promise<RestockHelpEntry> {
  const entry: RestockHelpEntry = { ...request, status: "pending", handledAt: null };
  writeItem(RESTOCK_STORAGE_KEYS.request, JSON.stringify(entry), store);
  return entry;
}

/** The latest request, or null (nothing stored, blocked storage, or unreadable data). */
export function readRestockHelp(store: KeyValueStore | null = browserStore()): RestockHelpEntry | null {
  const raw = readItem(RESTOCK_STORAGE_KEYS.request, store);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isEntry(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** /care "I'll handle it": the request leaves the caretaker's list; the phone can say help is on the way. */
export function markRestockHelpHandled(handledAt: string, store: KeyValueStore | null = browserStore()): RestockHelpEntry | null {
  const current = readRestockHelp(store);
  if (!current) return null;
  const handled: RestockHelpEntry = { ...current, status: "handled", handledAt };
  writeItem(RESTOCK_STORAGE_KEYS.request, JSON.stringify(handled), store);
  return handled;
}

export function clearRestockHelp(store: KeyValueStore | null = browserStore()): void {
  removeItem(RESTOCK_STORAGE_KEYS.request, store);
}

/** "I'll get it myself": remember the choice for this medicine. Returns false if storage is blocked. */
export function chooseRestockSelf(medicationId: string, store: KeyValueStore | null = browserStore()): boolean {
  return writeItem(RESTOCK_STORAGE_KEYS.self, medicationId, store);
}

/** The medicine the senior said she'd restock herself, or null. */
export function readRestockSelf(store: KeyValueStore | null = browserStore()): string | null {
  return readItem(RESTOCK_STORAGE_KEYS.self, store);
}

/** The medicine with the fewest days of supply at or under `soonDays` (active ones only), or null when none is low. */
export function pickRestockAlert(
  medications: ReadonlyArray<{ id: string; name: string; daysOfSupply: number | null; active: boolean }>,
  soonDays: number,
): { medicationId: string; name: string; daysRemaining: number } | null {
  const low = medications
    .filter((med) => med.active && med.daysOfSupply !== null && med.daysOfSupply <= soonDays)
    .sort((a, b) => (a.daysOfSupply ?? 0) - (b.daysOfSupply ?? 0))[0];
  return low ? { medicationId: low.id, name: low.name, daysRemaining: low.daysOfSupply ?? 0 } : null;
}

/** Should the restock card show? While the supply is low, whatever the senior chose (the choice only changes its status line). */
export function shouldShowRestock(daysRemaining: number | null, soonDays: number): boolean {
  return daysRemaining !== null && daysRemaining <= soonDays;
}
