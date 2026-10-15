import { useCallback, useState } from "react";
import { api } from "../../lib/api";

export type TreatStatus = "idle" | "sending" | "sent" | "failed";

/**
 * "Send Buddy a treat" from /care: the same POST /api/treats the phone used (api.sendTreat).
 * The message carries the sender's name so the senior's gift chip can say who sent it.
 * Offline (the /care rule): sending is disabled; the page shows a calm notice instead.
 */
export function useCareTreat(offline: boolean) {
  const [status, setStatus] = useState<TreatStatus>("idle");
  const send = useCallback(async (message: string) => {
    if (offline) return;
    setStatus("sending");
    try {
      await api.sendTreat(message);
      setStatus("sent");
    } catch (error) {
      console.warn("Pawtner API:", error);
      setStatus("failed");
    }
  }, [offline]);
  return { status, send };
}
