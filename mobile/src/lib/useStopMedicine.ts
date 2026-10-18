import { useRef, useState } from "react";
import { api } from "./api";
import { canConfirmStop, stopRowsAfter, type StopEvent, type StopRows } from "./stopMedicine";

/**
 * Stop / Undo for My medicines: row states (lib/stopMedicine.ts) plus the API calls.
 * `onChanged` runs after every successful stop or undo, so Home's doses are re-read before the senior returns there.
 * A "Yes, stop it" tap the helper ignores (double-tap guard) never reaches the API.
 */
export function useStopMedicine(onChanged: () => void, now: () => number = Date.now) {
  const [rows, setRowsState] = useState<StopRows>({});
  // Latest rows, so two taps in one frame both see the first tap's result.
  const rowsRef = useRef(rows);
  const apply = (id: string, event: StopEvent) => {
    rowsRef.current = stopRowsAfter(rowsRef.current, id, event, now());
    setRowsState(rowsRef.current);
  };

  const stop = async (id: string) => {
    if (!canConfirmStop(rowsRef.current[id], now())) return; // ignored: no error, no visual change, no API call
    apply(id, "confirm");
    try {
      await api.updateMedication(id, { active: false });
      apply(id, "stopped");
      onChanged();
    } catch (error) {
      // Never show the raw error to the senior; log it for diagnosis instead.
      console.warn("My medicines: stop failed:", error);
      apply(id, "stopFailed");
    }
  };

  const undo = async (id: string) => {
    if (rowsRef.current[id]?.status !== "stopped") return;
    apply(id, "undo");
    try {
      await api.updateMedication(id, { active: true });
      apply(id, "undone");
      onChanged();
    } catch (error) {
      console.warn("My medicines: undo failed:", error);
      apply(id, "undoFailed");
    }
  };

  return {
    rows,
    open: (id: string) => apply(id, "open"),
    cancel: (id: string) => apply(id, "cancel"),
    /** "Back to Medicine list" from the stopped card: ends its Undo (the medicine leaves the list). */
    dismiss: (id: string) => apply(id, "dismiss"),
    stop,
    undo,
  };
}
