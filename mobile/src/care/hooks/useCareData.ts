import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { buildMockCareData } from "../data/mock";
import type { CareData } from "../data/types";

export type SaveStatus = "idle" | "saving" | "saved" | "failed";

/** Technical detail goes to the console, never to the page (same rule as reportApiProblem in App.tsx). */
function logApiProblem(error: unknown) {
  console.warn("Pawtner API:", error);
}

/**
 * Loads today, the caretaker summary and the check-in settings once.
 * Any call that fails falls back to typed mock data and sets `offline`, so the page shows one friendly notice.
 */
export function useCareData() {
  const [data, setData] = useState<CareData | null>(null);
  const [offline, setOffline] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [pendingThreshold, setPendingThreshold] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [today, summary, escalation] = await Promise.allSettled([api.today(), api.caretakerSummary(), api.escalationSettings()]);
      if (cancelled) return;
      const mock = buildMockCareData(new Date());
      const results = [today, summary, escalation];
      results.forEach((result) => { if (result.status === "rejected") logApiProblem(result.reason); });
      setOffline(results.some((result) => result.status === "rejected"));
      setData({
        today: today.status === "fulfilled" ? today.value : mock.today,
        summary: summary.status === "fulfilled" ? summary.value : mock.summary,
        escalation: escalation.status === "fulfilled" ? escalation.value : mock.escalation,
      });
    })();
    return () => { cancelled = true; };
  }, []);

  /**
   * Saves the check-in settings (on/off and the number of missed days) through the one existing endpoint.
   * Both live here on /care since 16 Oct (user: the caretaker sets them, not the senior's phone).
   */
  const saveEscalation = useCallback(async (next: { optedIn?: boolean; threshold?: number }) => {
    if (!data || offline) return;
    const optedIn = next.optedIn ?? data.escalation.optedIn;
    const threshold = next.threshold ?? data.escalation.threshold;
    setPendingThreshold(threshold);
    setSaveStatus("saving");
    try {
      const escalation = await api.updateEscalationSettings({ optedIn, threshold });
      setData((current) => (current ? { ...current, escalation } : current));
      setSaveStatus("saved");
    } catch (error) {
      logApiProblem(error);
      setSaveStatus("failed");
    } finally {
      setPendingThreshold(null);
    }
  }, [data, offline]);

  const saveThreshold = useCallback((threshold: number) => saveEscalation({ threshold }), [saveEscalation]);
  const saveConsent = useCallback((optedIn: boolean) => saveEscalation({ optedIn }), [saveEscalation]);

  return { data, offline, saveStatus, pendingThreshold, saveThreshold, saveConsent };
}
