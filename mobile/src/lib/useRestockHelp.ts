import { useCallback, useEffect, useState } from "react";
import type { RestockRequest } from "../../../shared/contract";
import { RESTOCK_SOON_DAYS } from "../config/restock";
import { api } from "./api";
import { chooseRestockSelf, readRestockSelf, restockCardState, shouldShowRestock, type RestockAlertItem, type RestockCardState } from "./restockHelp";

/** How often the phone re-reads the requests while a card shows, so "will help" appears after the caretaker taps. */
const REFRESH_MS = 15_000;

export interface RestockCardView {
  alert: RestockAlertItem;
  state: RestockCardState;
  busy: boolean;
}

/**
 * Phone side of restock help: one card per low medicine (`alerts`, from GET /api/medications; mock offline).
 * - offer: "Ask {{caretaker}} to help" / "I'll get it myself"
 * - asked: the request waits on /care (from the server)
 * - handled: a caretaker tapped "I'll handle it" on /care (from the server)
 * - self: the senior chose "I'll get it myself" (this phone only)
 * `onApiError` reports a failed request (the toast); nothing pretends to be shared.
 */
export function useRestockHelp(alerts: readonly RestockAlertItem[], onApiError: (error: unknown) => void) {
  const [requests, setRequests] = useState<RestockRequest[]>([]);
  const [selfIds, setSelfIds] = useState<string[]>(() => readRestockSelf());
  const [busyId, setBusyId] = useState<string | null>(null);
  const visible = alerts.filter((alert) => shouldShowRestock(alert.daysRemaining, RESTOCK_SOON_DAYS));
  const visibleKey = visible.map((alert) => alert.medicationId).join(",");

  const load = useCallback(async () => {
    try { setRequests((await api.restockRequests()).restockRequests); }
    catch (error) { console.warn("Restock: requests unavailable", error); }
  }, []);

  // While a card shows: read now, every REFRESH_MS, and when the app comes back to the front.
  useEffect(() => {
    if (!visibleKey) return;
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, REFRESH_MS);
    const onVisible = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [visibleKey, load]);

  const askForHelp = useCallback(async (alert: RestockAlertItem) => {
    if (busyId) return;
    setBusyId(alert.medicationId);
    try {
      const created = await api.createRestockRequest({ medicationId: alert.medicationId, daysLeft: alert.daysRemaining, requestedAt: new Date().toISOString() });
      setRequests((current) => [created, ...current.filter((request) => request.id !== created.id)]);
    } catch (error) {
      onApiError(error);
    } finally {
      setBusyId(null);
    }
  }, [busyId, onApiError]);

  const getItMyself = useCallback((alert: RestockAlertItem) => setSelfIds(chooseRestockSelf(alert.medicationId)), []);

  const cards: RestockCardView[] = visible.map((alert) => ({ alert, state: restockCardState(alert.medicationId, requests, selfIds), busy: busyId === alert.medicationId }));
  return { cards, askForHelp, getItMyself, needsAttention: cards.some((card) => card.state === "offer") };
}
