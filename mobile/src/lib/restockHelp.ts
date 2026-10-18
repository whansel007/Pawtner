import { RESTOCK_STORAGE_KEYS } from "../config/restock.js";
import type { RestockRequest } from "../../../shared/contract.js";
import { browserStore, readItem, writeItem, type KeyValueStore } from "./localStore.js";

/**
 * Restock help (pure helpers): the senior asks her caretaker to help with a medicine refill, one card per low medicine.
 *
 * The requests live on the server (POST /api/restock-requests, GET /api/restock-requests, POST /:id/handled; migration
 * 008), so /care sees them from any browser. Only "I'll get it myself" stays on this phone.
 *
 * Privacy (user, 16 Oct; DECISIONS): asking for help shares that one medicine's name, so the caretaker knows what to
 * buy; /care shows it with the days left. For a sensitive medicine the senior picks "I'll get it myself" and nothing is sent.
 */

/** A low-supply medicine (one restock card). */
export interface RestockAlertItem {
  medicationId: string;
  name: string;
  daysRemaining: number;
}

export type RestockCardState = "offer" | "asked" | "handled" | "self";

/** Every active medicine at or under `soonDays` days of supply, fewest days first (one card each). */
export function pickRestockAlerts(
  medications: ReadonlyArray<{ id: string; name: string; daysOfSupply: number | null; active: boolean }>,
  soonDays: number,
): RestockAlertItem[] {
  return medications
    .filter((med) => med.active && med.daysOfSupply !== null && med.daysOfSupply <= soonDays)
    .sort((a, b) => (a.daysOfSupply ?? 0) - (b.daysOfSupply ?? 0))
    .map((med) => ({ medicationId: med.id, name: med.name, daysRemaining: med.daysOfSupply ?? 0 }));
}

/**
 * One card's state from the server's requests and this phone's "I'll get it myself" choices:
 * the latest request for this medicine decides (handled → "handled", pending → "asked"); else "self" or "offer".
 */
export function restockCardState(medicationId: string, requests: readonly RestockRequest[], selfIds: readonly string[]): RestockCardState {
  const latest = requests
    .filter((request) => request.medicationId === medicationId)
    .sort((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt))[0];
  if (latest) return latest.status === "handled" ? "handled" : "asked";
  return selfIds.includes(medicationId) ? "self" : "offer";
}

/** Medicines the senior said she'd restock herself (this phone only). An older single id still reads. */
export function readRestockSelf(store: KeyValueStore | null = browserStore()): string[] {
  const raw = readItem(RESTOCK_STORAGE_KEYS.self, store);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [raw];
  } catch {
    return [raw];
  }
}

/** "I'll get it myself" for one medicine. Returns the new list (kept in memory even when storage is blocked). */
export function chooseRestockSelf(medicationId: string, store: KeyValueStore | null = browserStore()): string[] {
  const next = [...new Set([...readRestockSelf(store), medicationId])];
  writeItem(RESTOCK_STORAGE_KEYS.self, JSON.stringify(next), store);
  return next;
}

/** Should the restock card show? While the supply is low, whatever the senior chose (the choice only changes its status line). */
export function shouldShowRestock(daysRemaining: number | null, soonDays: number): boolean {
  return daysRemaining !== null && daysRemaining <= soonDays;
}
