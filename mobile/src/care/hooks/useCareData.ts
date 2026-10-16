import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { buildMockCareData } from "../data/mock";
import { readDemoClock } from "../../lib/demoClock";
import { DEMO_CLOCK_STORAGE_KEY } from "../../config/demo";
import type { CareData } from "../data/types";

export type SaveStatus = "idle" | "saving" | "saved" | "failed";

/** Technical detail goes to the console, never to the page (same rule as reportApiProblem in App.tsx). */
function logApiProblem(error: unknown) {
  console.warn("Pawtner API:", error);
}

/** How often /care re-reads today and the summary, so Buddy follows Rose's taps without a reload. */
const REFRESH_MS = 15_000;

/**
 * Loads today, the caretaker summary and the check-in settings, then (while `live`: a signed-in page) keeps today and the summary fresh: every
 * REFRESH_MS, when the tab is shown again, and when the phone's agent clock changes in this browser (lib/demoClock.ts).
 * Both are read at that clock, so Buddy's mood and hearts match Rose's phone.
 * Any call that fails falls back to typed mock data and sets `offline`, so the page shows one friendly notice.
 */
export function useCareData(live: boolean) {
  const [data, setData] = useState<CareData | null>(null);
  const [offline, setOffline] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [pendingThreshold, setPendingThreshold] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const at = readDemoClock() ?? undefined;
      const [today, summary, escalation] = await Promise.allSettled([api.today(at), api.caretakerSummary(at), api.escalationSettings()]);
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

  // Refresh today and the summary only (never the check-in settings, which may be mid-save). Quiet on failure.
  useEffect(() => {
    if (offline || !live) return;
    const refresh = async () => {
      const at = readDemoClock() ?? undefined;
      try {
        const [today, summary] = await Promise.all([api.today(at), api.caretakerSummary(at)]);
        setData((current) => (current ? { ...current, today, summary } : current));
      } catch (error) {
        logApiProblem(error);
      }
    };
    const onStorage = (event: StorageEvent) => { if (event.key === null || event.key === DEMO_CLOCK_STORAGE_KEY) void refresh(); };
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    // Signing in (live turns on) reads the latest state at once.
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, REFRESH_MS);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [offline, live]);

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
