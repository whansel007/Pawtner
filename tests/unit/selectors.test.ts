import { describe, expect, it } from "vitest";
import { buildAgentInput, computeHeart, computeHeartsTotal, heartActivities, computeMissedDays, computeStreak, deriveDoseStatus, hasBloodPressureToday, selectAgentInput, selectHeartActivities, selectHeartsTotal } from "../../shared/selectors.js";
import type { DerivedDose, DoseSchedule, HealthMetric } from "../../shared/contract.js";
import type { AgentSelectionSource } from "../../shared/selectors.js";

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
    expect(deriveDoseStatus(seedSchedule, [{ id: "e1", scheduleId: seedSchedule.id, scheduledFor: seedSchedule.scheduledAt, event: "taken", occurredAt: "2026-10-13T11:01:00+08:00" }], "2026-10-13T11:02:00+08:00").status).toBe("taken");
    expect(deriveDoseStatus(seedSchedule, [{ id: "e2", scheduleId: seedSchedule.id, scheduledFor: seedSchedule.scheduledAt, event: "skipped", occurredAt: "2026-10-13T11:01:00+08:00" }], "2026-10-13T11:02:00+08:00").status).toBe("skipped");
    expect(deriveDoseStatus(seedSchedule, [{ id: "yesterday", scheduleId: seedSchedule.id, scheduledFor: "2026-10-12T10:00:00+08:00", event: "taken", occurredAt: "2026-10-12T10:01:00+08:00" }], "2026-10-13T11:00:00+08:00").status).toBe("missed");
    expect("missed" in deriveDoseStatus(seedSchedule, [], "2026-10-13T11:00:00+08:00")).toBe(false);
  });

  it("starts the day at 1 heart and adds one per activity: all medicines, a measurement, a walk", () => {
    const taken = deriveDoseStatus(seedSchedule, [{ id: "e1", scheduleId: seedSchedule.id, scheduledFor: seedSchedule.scheduledAt, event: "taken", occurredAt: "2026-10-13T10:10:00+08:00" }], "2026-10-13T10:11:00+08:00");
    const missed = deriveDoseStatus({ ...seedSchedule, id: "second" }, [], "2026-10-13T12:00:00+08:00");
    const upcoming = deriveDoseStatus({ ...seedSchedule, id: "third" }, [], "2026-10-13T09:00:00+08:00");
    // 1 of 3 medicines taken earns no medicine heart: all of them must be taken.
    expect(computeHeart(heartActivities([taken, missed, upcoming], false, false))).toBe(1);
    expect(computeHeart(heartActivities([taken], false, false))).toBe(2);
    expect(computeHeart(heartActivities([taken, missed], true, false))).toBe(2);
    expect(computeHeart(heartActivities([taken], true, true))).toBe(4);
    // Nothing scheduled: the medicines count as done.
    expect(computeHeart(heartActivities([], false, false))).toBe(2);
    expect(heartActivities([taken, missed], true, true)).toEqual({ medicines: false, bloodPressure: true, walk: true });
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

  it("counts days in a row with a missed dose, back from yesterday (today never counts)", () => {
    const day = (date: string, ...taken: boolean[]) => taken.map((value, index) => ({ date, scheduleId: `s${index}`, taken: value }));
    expect(computeMissedDays([...day("2026-10-12", true, false), ...day("2026-10-13", false)], "2026-10-13"))
      .toEqual({ count: 1, lastMissedDay: "2026-10-12" });
    expect(computeMissedDays([...day("2026-10-10", true, true), ...day("2026-10-11", false, false), ...day("2026-10-12", true, false)], "2026-10-13"))
      .toEqual({ count: 2, lastMissedDay: "2026-10-12" });
    expect(computeMissedDays([...day("2026-10-11", false), ...day("2026-10-12", true, true)], "2026-10-13"))
      .toEqual({ count: 0, lastMissedDay: null });
    expect(computeMissedDays([], "2026-10-13")).toEqual({ count: 0, lastMissedDay: null });
  });

  it("detects BP logged today and rejects caretaker thresholds below one day", () => {
    const metric: HealthMetric = { id: "bp", kind: "blood_pressure", systolic: 120, diastolic: 80, note: null, recordedAt: "2026-10-13T08:00:00+08:00" };
    expect(hasBloodPressureToday([metric], "2026-10-13")).toBe(true);
    expect(hasBloodPressureToday([metric], "2026-10-14")).toBe(false);
    expect(() => buildAgentInput({
      now: "2026-10-13T10:00:00+08:00", userId: "u", dog: { id: "d", name: "Buddy", heart: 2, streak: 0 },
      doses: [], healthMetrics: [], daysOfSupplyByMedicationId: {}, consecutiveMissedDays: 0,
      lastMissedDay: null, lastCheckInDay: null, caretaker: { optedIn: true, threshold: 0 },
    })).toThrow(/at least 1/);
  });

  it("assembles AgentInput from fictional schedule, ledger, nudge, and health rows", () => {
    const yesterday = "2026-10-12T10:00:00+08:00";
    const todayMorning = "2026-10-13T10:00:00+08:00";
    const todayEvening = "2026-10-13T20:00:00+08:00";
    const source: AgentSelectionSource = {
      now: "2026-10-13T11:00:00+08:00",
      today: "2026-10-13",
      userId: "00000000-0000-4000-8000-000000000001",
      dog: { id: "00000000-0000-4000-8000-000000000003", name: "Buddy" },
      doseOccurrences: [
        { ...seedSchedule, scheduledAt: yesterday },
        { ...seedSchedule, scheduledAt: todayMorning },
        { ...seedSchedule, id: "evening-schedule", scheduledAt: todayEvening },
      ],
      doseEvents: [{ id: "seed-event", scheduleId: seedSchedule.id, scheduledFor: yesterday, event: "taken", occurredAt: "2026-10-12T10:05:00+08:00" }],
      nudges: [
        { scheduleId: seedSchedule.id, scheduledFor: yesterday, createdAt: "2026-10-12T11:00:00+08:00" },
        { scheduleId: seedSchedule.id, scheduledFor: todayMorning, createdAt: "2026-10-13T11:00:00+08:00" },
      ],
      healthMetrics: [{ id: "seed-bp", kind: "blood_pressure", systolic: 120, diastolic: 80, note: null, recordedAt: "2026-10-13T08:00:00+08:00" }],
      daysOfSupplyByMedicationId: { "00000000-0000-4000-8000-000000000004": 14 },
      caretaker: { optedIn: true, threshold: 2 },
      lastCheckInDay: null,
      walkFinishedAt: [],
    };
    const input = selectAgentInput(source);

    expect(input.doses.map((dose) => dose.status)).toEqual(["missed", "upcoming"]);
    expect(input.doses[0]).toMatchObject({ nudgeCount: 1, lastNudgeAt: "2026-10-13T11:00:00+08:00" });
    // Start heart + the measurement logged this morning; the medicines aren't all taken yet.
    expect(input.dog).toMatchObject({ heart: 2, streak: 1 });
    // Yesterday was taken, so no missed days (today's missed morning dose doesn't count until the day is over).
    expect(input).toMatchObject({ consecutiveMissedDays: 0, lastMissedDay: null });
    expect(input.latestDoseEvent).toBeNull();
    expect(selectAgentInput({ ...source, triggeringDoseEventId: "seed-event" }).latestDoseEvent?.scheduledFor).toBe(yesterday);
  });

  describe("computeHeartsTotal", () => {
    const dose = (id: string, scheduledAt: string, status: DerivedDose["status"]): DerivedDose => ({
      ...seedSchedule, id, scheduledAt, status, eventAt: null, nudgeCount: 0, lastNudgeAt: null,
    });
    const bp = (recordedAt: string): HealthMetric => ({ id: `bp-${recordedAt}`, kind: "blood_pressure", systolic: 120, diastolic: 80, note: null, recordedAt });

    it("is 0 with no dose history, even when readings exist", () => {
      expect(computeHeartsTotal([], [], "2026-10-13")).toBe(0);
      expect(computeHeartsTotal([], [bp("2026-10-13T08:00:00.000Z")], "2026-10-13")).toBe(0);
    });

    it("sums each day's heart across several days, today included", () => {
      const doses = [
        dose("a", "2026-10-11T02:00:00.000Z", "taken"), dose("b", "2026-10-11T12:00:00.000Z", "taken"), // 1 + medicines = 2
        dose("a", "2026-10-12T02:00:00.000Z", "taken"), dose("b", "2026-10-12T12:00:00.000Z", "missed"), // 1
        dose("a", "2026-10-13T02:00:00.000Z", "skipped"), dose("b", "2026-10-13T12:00:00.000Z", "upcoming"), // 1
      ];
      expect(computeHeartsTotal(doses, [], "2026-10-13")).toBe(4);
      // A walk on the 12th adds that day's walk heart.
      expect(computeHeartsTotal(doses, [], "2026-10-13", ["2026-10-12T09:00:00.000Z"])).toBe(5);
    });

    it("adds the measurement heart on the days a reading was logged", () => {
      const doses = [dose("a", "2026-10-11T02:00:00.000Z", "missed"), dose("a", "2026-10-12T02:00:00.000Z", "taken")];
      expect(computeHeartsTotal(doses, [bp("2026-10-11T08:00:00.000Z"), bp("2026-10-12T08:00:00.000Z")], "2026-10-12")).toBe(2 + 3);
      // Readings before the first scheduled dose add nothing.
      expect(computeHeartsTotal(doses, [bp("2026-10-10T08:00:00.000Z")], "2026-10-12")).toBe(1 + 2);
    });

    it("counts gap days as medicines done, an untaken today as not yet, and ignores anything after today", () => {
      const doses = [
        dose("a", "2026-10-10T02:00:00.000Z", "taken"), // 2
        // 2026-10-11 and 2026-10-12: nothing scheduled -> 2 each
        dose("a", "2026-10-13T12:00:00.000Z", "upcoming"), // today, not taken yet -> 1
        dose("a", "2026-10-14T02:00:00.000Z", "taken"), // future: ignored
      ];
      expect(computeHeartsTotal(doses, [bp("2026-10-14T08:00:00.000Z")], "2026-10-13", ["2026-10-14T09:00:00.000Z"])).toBe(2 + 2 + 2 + 1);
    });

    it("selects a total whose today's share equals the dog's heart", () => {
      const source: AgentSelectionSource = {
        now: "2026-10-13T11:00:00.000Z",
        today: "2026-10-13",
        userId: "u",
        dog: { id: "d", name: "Buddy" },
        doseOccurrences: [
          { ...seedSchedule, scheduledAt: "2026-10-12T02:00:00.000Z" },
          { ...seedSchedule, scheduledAt: "2026-10-13T02:00:00.000Z" },
          { ...seedSchedule, scheduledAt: "2026-10-14T02:00:00.000Z" },
        ],
        doseEvents: [
          { id: "e1", scheduleId: seedSchedule.id, scheduledFor: "2026-10-12T02:00:00.000Z", event: "taken", occurredAt: "2026-10-12T02:05:00.000Z" },
          { id: "e2", scheduleId: seedSchedule.id, scheduledFor: "2026-10-13T02:00:00.000Z", event: "taken", occurredAt: "2026-10-13T02:05:00.000Z" },
          // Recorded after `now`: not visible yet.
          { id: "e3", scheduleId: seedSchedule.id, scheduledFor: "2026-10-14T02:00:00.000Z", event: "taken", occurredAt: "2026-10-14T02:05:00.000Z" },
        ],
        nudges: [],
        healthMetrics: [bp("2026-10-13T08:00:00.000Z")],
        daysOfSupplyByMedicationId: {},
        caretaker: null,
        lastCheckInDay: null,
        // Today's walk counts; tomorrow's (after `now`) doesn't.
        walkFinishedAt: ["2026-10-13T09:00:00.000Z", "2026-10-14T09:00:00.000Z"],
      };
      const input = selectAgentInput(source);
      expect(input.dog.heart).toBe(4);
      expect(selectHeartActivities(source)).toEqual({ medicines: true, bloodPressure: true, walk: true });
      expect(selectHeartsTotal(source)).toBe(2 + input.dog.heart);
    });
  });
});
