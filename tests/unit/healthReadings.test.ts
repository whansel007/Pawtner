import { describe, expect, it } from "vitest";
import type { HealthMetric } from "../../shared/contract.js";
import { mergeHealthMetrics } from "../../mobile/src/lib/healthReadings.js";

const reading = (id: string, systolic: number, diastolic: number, recordedAt: string): HealthMetric =>
  ({ id, kind: "blood_pressure", systolic, diastolic, note: null, recordedAt });

const morning = reading("00000000-0000-4000-8000-000000000101", 150, 88, "2026-10-17T09:00:00+08:00");
const noon = reading("00000000-0000-4000-8000-000000000102", 132, 84, "2026-10-17T12:00:00+08:00");

describe("mergeHealthMetrics", () => {
  it("fills an empty phone from the server after a reload", () => {
    expect(mergeHealthMetrics([morning, noon], [], [])).toEqual([morning, noon]);
  });

  it("swaps the phone's copy of a saved reading for the server's row (no duplicate)", () => {
    const local = reading("bp-1", 150, 88, "2026-10-17T09:00:20+08:00");
    expect(mergeHealthMetrics([morning], [local], [])).toEqual([morning]);
  });

  it("keeps a reading the server doesn't have yet (saved offline)", () => {
    const offline = reading("bp-2", 140, 90, "2026-10-17T13:00:00+08:00");
    expect(mergeHealthMetrics([morning], [morning, offline], [morning])).toEqual([morning, offline]);
  });

  it("drops the previous answer's rows when the new answer no longer has them (another day)", () => {
    const nextDay = reading("00000000-0000-4000-8000-000000000103", 128, 80, "2026-10-18T09:00:00+08:00");
    expect(mergeHealthMetrics([nextDay], [morning, noon], [morning, noon])).toEqual([nextDay]);
  });
});
