import { describe, expect, it } from "vitest";
import { buildAgentInput, computeHeart, computeStreak, deriveDoseStatus, hasBloodPressureToday } from "../../shared/selectors.js";
import type { DoseSchedule, HealthMetric } from "../../shared/contract.js";

const seedSchedule: DoseSchedule = {
  id: "00000000-0000-4000-8000-000000000006",
  medicationId: "00000000-0000-4000-8000-000000000004",
  medicationName: "Fictional Tablet A",
  strength: "5 mg",
  scheduledAt: "2026-10-13T10:00:00+08:00",
};

describe("selectors", () => {
  it("derives upcoming, due, missed, taken and skipped from schedule plus ledger events", () => {
    expect(deriveDoseStatus(seedSchedule, [], "2026-10-13T09:59:00+08:00").status).toBe("upcoming");
    expect(deriveDoseStatus(seedSchedule, [], "2026-10-13T10:59:00+08:00").status).toBe("due");
    expect(deriveDoseStatus(seedSchedule, [], "2026-10-13T11:00:00+08:00").status).toBe("missed");
    expect(deriveDoseStatus(seedSchedule, [{ id: "e1", scheduleId: seedSchedule.id, event: "taken", occurredAt: "2026-10-13T11:01:00+08:00" }], "2026-10-13T11:02:00+08:00").status).toBe("taken");
    expect(deriveDoseStatus(seedSchedule, [{ id: "e2", scheduleId: seedSchedule.id, event: "skipped", occurredAt: "2026-10-13T11:01:00+08:00" }], "2026-10-13T11:02:00+08:00").status).toBe("skipped");
    expect("missed" in deriveDoseStatus(seedSchedule, [], "2026-10-13T11:00:00+08:00")).toBe(false);
  });

  it("computes heart from taken share and today's blood-pressure log", () => {
    const taken = deriveDoseStatus(seedSchedule, [{ id: "e1", scheduleId: seedSchedule.id, event: "taken", occurredAt: "2026-10-13T10:10:00+08:00" }], "2026-10-13T10:11:00+08:00");
    const missed = deriveDoseStatus({ ...seedSchedule, id: "second" }, [], "2026-10-13T12:00:00+08:00");
    expect(computeHeart([taken, missed], false)).toBe(2);
    expect(computeHeart([taken, missed], true)).toBe(3);
    expect(computeHeart([], false)).toBe(2);
    expect(computeHeart([], true)).toBe(3);
  });

  it("computes consecutive complete days from ledger-derived taken values", () => {
    expect(computeStreak([
      { date: "2026-10-10", scheduleId: "a", taken: true },
      { date: "2026-10-11", scheduleId: "a", taken: true },
      { date: "2026-10-12", scheduleId: "a", taken: true },
      { date: "2026-10-12", scheduleId: "b", taken: true },
      { date: "2026-10-09", scheduleId: "a", taken: false },
    ], "2026-10-13")).toBe(3);
  });

  it("detects BP logged today and rejects caretaker thresholds below two", () => {
    const metric: HealthMetric = { id: "bp", kind: "blood_pressure", systolic: 120, diastolic: 80, note: null, recordedAt: "2026-10-13T08:00:00+08:00" };
    expect(hasBloodPressureToday([metric], "2026-10-13")).toBe(true);
    expect(hasBloodPressureToday([metric], "2026-10-14")).toBe(false);
    expect(() => buildAgentInput({
      now: "2026-10-13T10:00:00+08:00", userId: "u", dog: { id: "d", name: "Max", heart: 2, streak: 0 },
      doses: [], healthMetrics: [], daysOfSupplyByMedicationId: {}, consecutiveMissedDoses: 0,
      caretaker: { optedIn: true, threshold: 1 },
    })).toThrow(/at least 2/);
  });
});
