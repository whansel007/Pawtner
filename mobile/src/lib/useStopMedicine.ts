import { useState } from "react";
import { api } from "./api";
import { stopRowsAfter, type StopEvent, type StopRows } from "./stopMedicine";

/**
 * Stop / Undo for My medicines: row states (lib/stopMedicine.ts) plus the API calls.
 * `onChanged` runs after every successful stop or undo, so Home's doses are re-read before the senior returns there.
 */
export function useStopMedicine(onChanged: () => void) {
  const [rows, setRows] = useState<StopRows>({});
  const apply = (id: string, event: StopEvent) => setRows((current) => stopRowsAfter(current, id, event));

  const setActive = async (id: string, active: boolean) => {
    apply(id, active ? "undo" : "confirm");
    try {
      await api.updateMedication(id, { active });
      apply(id, active ? "undone" : "stopped");
      onChanged();
    } catch (error) {
      // Never show the raw error to the senior; log it for diagnosis instead.
      console.warn(`My medicines: ${active ? "undo" : "stop"} failed:`, error);
      apply(id, active ? "undoFailed" : "stopFailed");
    }
  };

  return {
    rows,
    open: (id: string) => apply(id, "open"),
    cancel: (id: string) => apply(id, "cancel"),
    stop: (id: string) => setActive(id, false),
    undo: (id: string) => setActive(id, true),
  };
}
