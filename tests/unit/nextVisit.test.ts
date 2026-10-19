import { describe, expect, it } from "vitest";
import { effectiveNextVisit, isCalendarDate, lastVisitAfterSaving, localDay, sideEffectNoteCounts } from "../../shared/nextVisit.js";
import { activeSideEffectNote, decide } from "../../shared/rules.js";
import type { AgentInput } from "../../shared/contract.js";

const TZ = "Asia/Singapore";
const sgt = (date: string, time = "09:00") => new Date(`${date}T${time}:00+08:00`).toISOString();

describe("the doctor's next visit: one condition", () => {
  it("is the saved date, or the day itself when none is saved or it has passed", () => {
    expect(effectiveNextVisit("2026-10-25", "2026-10-19")).toBe("2026-10-25");
    expect(effectiveNextVisit("2026-10-19", "2026-10-19")).toBe("2026-10-19");
    expect(effectiveNextVisit("2026-10-15", "2026-10-19")).toBe("2026-10-19"); // passed → today
    expect(effectiveNextVisit(null, "2026-10-19")).toBe("2026-10-19");
  });

  it("a note counts from its day until the end of its next-visit day", () => {
    // Visit on 25 Oct: a note from 22 Oct counts on 22..25, not on 26.
    expect(sideEffectNoteCounts("2026-10-22", "2026-10-22", "2026-10-25")).toBe(true);
    expect(sideEffectNoteCounts("2026-10-22", "2026-10-25", "2026-10-25")).toBe(true);
    expect(sideEffectNoteCounts("2026-10-22", "2026-10-26", "2026-10-25")).toBe(false);
    // No date: only on its own day.
    expect(sideEffectNoteCounts("2026-10-19", "2026-10-19", null)).toBe(true);
    expect(sideEffectNoteCounts("2026-10-18", "2026-10-19", null)).toBe(false);
    // A note written after a passed visit date counts that day only.
    expect(sideEffectNoteCounts("2026-10-20", "2026-10-20", "2026-10-15")).toBe(true);
    expect(sideEffectNoteCounts("2026-10-20", "2026-10-21", "2026-10-15")).toBe(false);
    // Never before it was written.
    expect(sideEffectNoteCounts("2026-10-22", "2026-10-21", "2026-10-25")).toBe(false);
  });

  it("days follow the senior's zone; dates are plain calendar dates", () => {
    expect(localDay("2026-10-18T16:00:00.000Z", TZ)).toBe("2026-10-19");
    expect(isCalendarDate("2026-10-25")).toBe(true);
    for (const bad of ["2026-02-30", "25/10/2026", "2026-10-25T00:00", "", 20261025]) expect(isCalendarDate(bad)).toBe(false);
  });

  it("the newest counting note wins; an old note stops counting after the visit day", () => {
    const readings = [
      { id: "a", note: "a bit dizzy", recordedAt: sgt("2026-10-16") },
      { id: "b", note: "I feel fine", recordedAt: sgt("2026-10-18") },
    ];
    expect(activeSideEffectNote(readings, sgt("2026-10-19", "12:00"), TZ, "2026-10-19")?.id).toBe("a");
    expect(activeSideEffectNote(readings, sgt("2026-10-20", "12:00"), TZ, "2026-10-19")).toBeNull();
    expect(activeSideEffectNote(readings, sgt("2026-10-19", "12:00"), TZ, null)).toBeNull();
  });
});

describe("two dates: a note discussed at a visit never comes back (owner: 'we should remember two dates')", () => {
  it("owner's example: note 1 Oct, visit 10 Oct, then the date set to 2 Nov after 10 Oct", () => {
    // On 15 Oct the 10 Oct visit has passed; saving 2 Nov makes 10 Oct the last visit.
    const last = lastVisitAfterSaving("2026-10-10", null, "2026-10-15");
    expect(last).toBe("2026-10-10");
    expect(sideEffectNoteCounts("2026-10-01", "2026-10-15", "2026-11-02", last)).toBe(false); // discussed on 10 Oct
    expect(sideEffectNoteCounts("2026-10-12", "2026-10-15", "2026-11-02", last)).toBe(true);
    expect(sideEffectNoteCounts("2026-10-12", "2026-11-02", "2026-11-02", last)).toBe(true);
    expect(sideEffectNoteCounts("2026-10-12", "2026-11-03", "2026-11-02", last)).toBe(false);
    expect(sideEffectNoteCounts("2026-10-10", "2026-10-15", "2026-11-02", last)).toBe(false); // written on the visit day
  });

  it("rescheduling a future date keeps the last visit; no last visit = no lower bound", () => {
    expect(lastVisitAfterSaving("2026-11-02", "2026-10-10", "2026-10-15")).toBe("2026-10-10");
    expect(lastVisitAfterSaving(null, "2026-10-10", "2026-10-15")).toBe("2026-10-10");
    expect(lastVisitAfterSaving("2026-10-15", null, "2026-10-15")).toBeNull(); // today's visit hasn't passed yet
    expect(sideEffectNoteCounts("2026-09-01", "2026-10-15", "2026-11-02", null)).toBe(true);
  });
});

describe("Buddy's doctor_question follows the same date", () => {
  const base: AgentInput = {
    now: sgt("2026-10-19", "12:00"), userId: "u", dog: { id: "d", name: "Buddy", heart: 2, streak: 0 },
    doses: [], healthMetrics: [{ id: "m", kind: "blood_pressure", systolic: 140, diastolic: 85, note: "Feeling dizzy", recordedAt: sgt("2026-10-16") }],
    daysOfSupplyByMedicationId: {}, consecutiveMissedDays: 0, lastMissedDay: null, lastCheckInDay: null, caretaker: null, timeZone: TZ,
  };
  it("a note 3 days before the visit still asks; the day after the visit it doesn't; no date → only today's note", () => {
    expect(decide({ ...base, nextDoctorVisit: "2026-10-19" }).decision).toBe("doctor_question");
    expect(decide({ ...base, now: sgt("2026-10-20", "12:00"), nextDoctorVisit: "2026-10-19" }).decision).not.toBe("doctor_question");
    expect(decide({ ...base, nextDoctorVisit: null }).decision).not.toBe("doctor_question");
    expect(decide({ ...base, healthMetrics: [{ ...base.healthMetrics[0], recordedAt: sgt("2026-10-19") }], nextDoctorVisit: null }).decision).toBe("doctor_question");
  });

  it("a note from before the last visit never asks again", () => {
    expect(decide({ ...base, nextDoctorVisit: "2026-10-25", lastDoctorVisit: "2026-10-17" }).decision).not.toBe("doctor_question");
    expect(decide({ ...base, nextDoctorVisit: "2026-10-25", lastDoctorVisit: "2026-10-15" }).decision).toBe("doctor_question");
  });
});
