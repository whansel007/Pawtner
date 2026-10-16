import { isSameReading } from "../../../shared/rules.js";
import type { HealthMetric } from "../../../shared/contract.js";

/**
 * Today's readings for the Health card after an /api/today answer: the server's rows, plus readings saved on this
 * phone that the server doesn't have yet (the save failed offline). Rows from the previous server answer that the
 * new one no longer returns (the demo clock moved to another day) are dropped, so they never linger.
 */
export function mergeHealthMetrics(
  server: readonly HealthMetric[],
  current: readonly HealthMetric[],
  previousServer: readonly HealthMetric[],
): HealthMetric[] {
  const unsaved = current.filter((metric) =>
    !previousServer.some((row) => row.id === metric.id) && !server.some((row) => isSameReading(row, metric)));
  return [...server, ...unsaved];
}
