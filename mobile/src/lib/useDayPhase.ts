import { useEffect, useState } from "react";
import { DEFAULT_PHASE, PHASE_RECHECK_MS, SENIOR_TIMEZONE, type DayPhase } from "../config/scene";
import { resolveDayPhase } from "./dayPhase";

const phaseAt = (demoNow: string | null) => resolveDayPhase(demoNow, new Date(), SENIOR_TIMEZONE, DEFAULT_PHASE);

/**
 * Day or night for the garden. With the Settings demo clock set, that time decides; otherwise the real clock does,
 * re-checked every PHASE_RECHECK_MS and whenever the app comes back to the foreground (timers sleep in background tabs).
 */
export function useDayPhase(demoNow: string | null): DayPhase {
  const [clockPhase, setClockPhase] = useState<DayPhase>(() => phaseAt(null));

  useEffect(() => {
    if (demoNow) return;
    const update = () => setClockPhase(phaseAt(null));
    const onVisible = () => {
      if (document.visibilityState === "visible") update();
    };
    update();
    const timer = window.setInterval(update, PHASE_RECHECK_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [demoNow]);

  return demoNow ? phaseAt(demoNow) : clockPhase;
}
