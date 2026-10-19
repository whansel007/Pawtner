import { useEffect, useState } from "react";
import type { HealthMetric } from "../../../shared/contract";
import { BP_LOG_DAYS } from "../../../shared/config";
import { api } from "./api";

/**
 * The blood-pressure log's readings: GET /api/health-metrics for the last BP_LOG_DAYS days at the app's clock.
 * Offline it shows the readings the phone already has (`fallback`, today's) and reports the problem once (`onOffline`).
 */
export function useBpLog(now: string, fallback: HealthMetric[], onOffline: (error: unknown) => void) {
  const [state, setState] = useState<{ status: "loading" | "ready" | "offline"; readings: HealthMetric[] }>({ status: "loading", readings: [] });
  useEffect(() => {
    let live = true;
    api.healthMetrics(BP_LOG_DAYS, now)
      .then((result) => { if (live) setState({ status: "ready", readings: result.healthMetrics }); })
      .catch((error) => { if (!live) return; onOffline(error); setState({ status: "offline", readings: fallback }); });
    return () => { live = false; };
    // Read once per opening of the screen.
  }, []);
  return state;
}
