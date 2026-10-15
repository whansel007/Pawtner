import { useCallback, useEffect, useState } from "react";
import { RESTOCK_SOON_DAYS } from "../config/restock";
import type { RestockAlert } from "../types";
import {
  chooseRestockSelf,
  markRestockHelpHandled,
  readRestockHelp,
  readRestockSelf,
  requestRestockHelp,
  shouldShowRestock,
  type RestockHelpEntry,
} from "./restockHelp";

/**
 * The stored restock request, kept in sync with other tabs of the same origin (the phone app and /care
 * open side by side): the browser's `storage` event fires in the other tabs when one of them writes.
 */
export function useRestockEntry() {
  const [entry, setEntry] = useState<RestockHelpEntry | null>(() => readRestockHelp());
  useEffect(() => {
    const sync = () => setEntry(readRestockHelp());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  return [entry, setEntry] as const;
}

export type RestockCardState = "offer" | "asked" | "handled" | "self";

/**
 * Phone side of restock help. `alert` is the low-supply medicine (`GET /api/medications`, mock offline; see App.tsx).
 * The card stays while the supply is low; the choice only swaps the buttons for a status line.
 * - offer: "Ask {{caretaker}} to help" / "I'll get it myself"
 * - asked: the request is waiting on /care
 * - handled: a caretaker tapped "I'll handle it" on /care
 * - self: the senior chose "I'll get it myself"
 */
export function useRestockHelp(alert: RestockAlert | null) {
  const [entry, setEntry] = useRestockEntry();
  // Kept in state too, so the choice holds for this session even when storage is blocked.
  const [selfMedicationId, setSelfMedicationId] = useState(() => readRestockSelf());
  const [busy, setBusy] = useState(false);

  // Only a request about this medicine counts.
  const current = alert && entry?.medicationId === alert.medicationId ? entry : null;
  const state: RestockCardState = current?.status === "handled" ? "handled"
    : current ? "asked"
    : alert && selfMedicationId === alert.medicationId ? "self"
    : "offer";
  const visible = alert !== null && shouldShowRestock(alert.daysRemaining, RESTOCK_SOON_DAYS);

  const getItMyself = useCallback(() => {
    if (!alert) return;
    chooseRestockSelf(alert.medicationId);
    setSelfMedicationId(alert.medicationId);
  }, [alert]);

  const askForHelp = useCallback(async () => {
    if (!alert || busy) return;
    setBusy(true);
    try {
      setEntry(await requestRestockHelp({ medicationId: alert.medicationId, medicationName: alert.name, daysLeft: alert.daysRemaining, requestedAt: new Date().toISOString() }));
    } finally {
      setBusy(false);
    }
  }, [alert, busy, setEntry]);

  return { visible, state, busy, askForHelp, getItMyself, needsAttention: visible && state === "offer" };
}

/** /care side: the pending request (or null) and "I'll handle it". */
export function usePendingRestockRequest() {
  const [entry, setEntry] = useRestockEntry();
  const pending = entry?.status === "pending" ? entry : null;
  const handle = useCallback(() => setEntry(markRestockHelpHandled(new Date().toISOString())), [setEntry]);
  return { pending, handle };
}
