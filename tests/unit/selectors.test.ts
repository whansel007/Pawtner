import { describe, expect, it } from "vitest";
import { actionableDoses, buildAgentInput, computeHeart, computeHeartsTotal, heartActivities, heartGains, heartsAt, computeMissedDays, computeStreak, deriveDoseStatus, hasBloodPressureToday, selectAgentInput, selectHeartActivities, selectHeartsTotal } from "../../shared/selectors.js";
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

  it("names the day's activities: all medicines (only when some were scheduled), a measurement, a walk", () => {
    const taken = deriveDoseStatus(seedSchedule, [{ id: "e1", scheduleId: seedSchedule.id, scheduledFor: seedSchedule.scheduledAt, event: "taken", occurredAt: "2026-10-13T10:10:00+08:00" }], "2026-10-13T10:11:00+08:00");
    const missed = deriveDoseStatus({ ...seedSchedule, id: "second" }, [], "2026-10-13T12:00:00+08:00");
    expect(heartActivities([taken, missed], true, true)).toEqual({ medicines: false, bloodPressure: true, walk: true });
    expect(heartActivities([taken], false, false).medicines).toBe(true);
    expect(heartActivities([], false, false).medicines).toBe(false);
    // Offline (no history): the minimum plus one per activity.
    expect(computeHeart({ medicines: true, bloodPressure: true, walk: false })).toBe(3);
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
    // Yesterday's medicines (2) dropped to 1 overnight; this morning's measurement brings it back to 2.
    expect(input.dog).toMatchObject({ heart: 2, streak: 1 });
    // Yesterday was taken, so no missed days (today's missed morning dose doesn't count until the day is over).
    expect(input).toMatchObject({ consecutiveMissedDays: 0, lastMissedDay: null });
    expect(input.latestDoseEvent).toBeNull();
    expect(selectAgentInput({ ...source, triggeringDoseEventId: "seed-event" }).latestDoseEvent?.scheduledFor).toBe(yesterday);
  });

  describe("hearts over time", () => {
    const dose = (id: string, scheduledAt: string, status: DerivedDose["status"], eventAt: string | null = null): DerivedDose => ({
      ...seedSchedule, id, scheduledAt, status, eventAt, nudgeCount: 0, lastNudgeAt: null,
    });
    const bp = (recordedAt: string): HealthMetric => ({ id: `bp-${recordedAt}`, kind: "blood_pressure", systolic: 120, diastolic: 80, note: null, recordedAt });
    const at = (hours: number) => new Date(Date.parse("2026-10-13T00:00:00.000Z") + hours * 3_600_000).toISOString();

    it("earns one heart per activity up to 4, and loses one every 12 hours without a new heart (never below 1)", () => {
      expect(heartsAt([], at(0))).toBe(1);
      const three = [at(0), at(1), at(2)];
      expect(heartsAt(three, at(2))).toBe(4);
      expect(heartsAt(three, at(13))).toBe(4);
      expect(heartsAt(three, at(14))).toBe(3);
      expect(heartsAt(three, at(26))).toBe(2); // 24 hours with nothing done: 2 hearts fewer
      expect(heartsAt(three, at(100))).toBe(1);
      // Joyful in the evening, 3 the next morning, one activity: back to 4.
      expect(heartsAt([...three, at(15)], at(15))).toBe(4);
      // Each heart restarts the timer, even at 4.
      expect(heartsAt([...three, at(10)], at(21))).toBe(4);
      expect(heartsAt([...three, at(10)], at(22))).toBe(3);
    });

    it("counts the medicines heart once all of the day's doses are taken, at the last one", () => {
      const doses = [dose("a", "2026-10-13T02:00:00.000Z", "taken", at(2.1)), dose("b", "2026-10-13T12:00:00.000Z", "upcoming")];
      expect(heartGains(doses, [], [])).toEqual([]);
      const both = [doses[0]!, dose("b", "2026-10-13T12:00:00.000Z", "taken", at(12.2))];
      expect(heartGains(both, [bp(at(1)), bp(at(5))], [at(9), at(10)])).toEqual([at(1), at(9), at(12.2)]);
    });

    it("sums each day's hearts at the end of the day, today at now", () => {
      const doses = [
        // Taken at 02:05: 2 hearts, but by the end of the 11th (12 hours later) it has dropped back to 1.
        dose("a", "2026-10-11T02:00:00.000Z", "taken", "2026-10-11T02:05:00.000Z"),
        dose("a", "2026-10-12T02:00:00.000Z", "missed"), // nothing on the 12th: 1
        dose("a", "2026-10-13T02:00:00.000Z", "taken", "2026-10-13T02:05:00.000Z"), // today, an hour later: 2
        // Taken at 20:05 on the 14th (12:05Z): still 2 at the end of that day.
        dose("a", "2026-10-14T12:00:00.000Z", "taken", "2026-10-14T12:05:00.000Z"),
      ];
      expect(computeHeartsTotal(doses, [], "2026-10-13", [], "2026-10-13T03:00:00.000Z")).toBe(1 + 1 + 2);
      // The 15th at 00:30Z is more than 12 hours after the 14th's heart: back to 1.
      expect(computeHeartsTotal(doses, [], "2026-10-15", [], "2026-10-15T00:30:00.000Z")).toBe(1 + 1 + 1 + 2 + 1);
      expect(computeHeartsTotal([], [bp(at(1))], "2026-10-13", [], at(2))).toBe(0);
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
      // The 12th ended on 1 (its medicines heart had dropped by then); today is 4.
      expect(selectHeartsTotal(source)).toBe(1 + input.dog.heart);
    });
  });

  describe("a stop is a moment: it never rewrites the past", () => {
    const dose = (id: string, scheduledAt: string, status: DerivedDose["status"], eventAt: string | null = null): DerivedDose => ({
      ...seedSchedule, id, scheduledAt, status, eventAt, nudgeCount: 0, lastNudgeAt: null,
    });
    const at = (hours: number) => new Date(Date.parse("2026-10-13T00:00:00.000Z") + hours * 3_600_000).toISOString();
    // A taken at 02:00 (10:00 SGT); B due 12:00 (20:00 SGT).
    const aTaken = dose("a", at(2), "taken", at(2.1));
    const bDue = dose("b", at(12), "upcoming");

    it("no stopped doses = the same gains as before", () => {
      expect(heartGains([aTaken, dose("b", at(12), "taken", at(12.2))], [], [])).toEqual([at(12.2)]);
      expect(heartGains([aTaken, bDue], [], [], [])).toEqual([]);
    });

    it("a stop that leaves the day all taken earns the heart at the stop, never earlier", () => {
      // B stopped at 04:00: before the stop the day was incomplete, so no heart before 04:00.
      const gains = heartGains([aTaken], [], [], [{ scheduledAt: at(12), stoppedAt: at(4), takenAt: null }]);
      expect(gains).toEqual([at(4)]);
      expect(heartsAt(gains, at(3.9))).toBe(1);
      expect(heartsAt(gains, at(4))).toBe(2);
    });

    it("a removed dose taken before the stop keeps the heart at its real time", () => {
      expect(heartGains([aTaken], [], [], [{ scheduledAt: at(12), stoppedAt: at(4), takenAt: at(3) }])).toEqual([at(3)]);
    });

    it("a day left with no doses earns no medicine heart (unless all removed doses were already taken)", () => {
      expect(heartGains([], [], [], [{ scheduledAt: at(2), stoppedAt: at(1), takenAt: null }])).toEqual([]);
      expect(heartGains([], [], [], [{ scheduledAt: at(2), stoppedAt: at(3), takenAt: at(0.5) }])).toEqual([at(0.5)]);
    });

    it("a stop on a day where it removed nothing leaves that day alone", () => {
      const dayBefore = (hours: number) => new Date(Date.parse(at(hours)) - 86_400_000).toISOString();
      const yesterdayTaken = dose("y", dayBefore(2), "taken", dayBefore(2.1));
      // Stopped today at 04:00, removing today's 12:00 dose only: yesterday's heart stays at its real time.
      expect(heartGains([yesterdayTaken, aTaken], [], [], [{ scheduledAt: at(12), stoppedAt: at(4), takenAt: null }])).toEqual([dayBefore(2.1), at(4)]);
    });

    it("a missed-then-stopped dose is never actionable again but still counts as missed for the day", () => {
      const stoppedMed = "stopped-med";
      // Tablet A due 10:00 SGT, missed; stopped at 11:30; the other medicine (B) is due 20:00.
      const source: AgentSelectionSource = {
        now: "2026-10-13T12:00:00+08:00",
        today: "2026-10-13",
        userId: "u",
        dog: { id: "d", name: "Buddy" },
        doseOccurrences: [
          { ...seedSchedule, id: "a-schedule", medicationId: stoppedMed, scheduledAt: "2026-10-13T10:00:00+08:00" },
          { ...seedSchedule, id: "b-schedule", medicationName: "Fictional Tablet B", scheduledAt: "2026-10-13T20:00:00+08:00" },
        ],
        stopCutoffs: [],
        stoppedMedicationIds: [stoppedMed],
        doseEvents: [],
        nudges: [],
        healthMetrics: [],
        daysOfSupplyByMedicationId: {},
        caretaker: { optedIn: true, threshold: 1 },
        lastCheckInDay: null,
        walkFinishedAt: [],
      };
      const input = selectAgentInput(source);
      // Not on the list (Home, Reminders, dose-time reminder) and not nudged: only B is actionable.
      expect(input.doses.map((dose) => dose.id)).toEqual(["b-schedule"]);
      expect(input.doses.some((dose) => dose.status === "missed")).toBe(false);
      // Still counts: today's medicines are not all taken, and tomorrow today is a missed day (check-ins).
      expect(selectHeartActivities(source).medicines).toBe(false);
      const tomorrow = selectAgentInput({ ...source, now: "2026-10-14T09:00:00+08:00", today: "2026-10-14" });
      expect(tomorrow).toMatchObject({ consecutiveMissedDays: 1, lastMissedDay: "2026-10-13" });
      expect(actionableDoses(input.doses, {})).toEqual(input.doses);
    });
  });
});
