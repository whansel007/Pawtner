import { describe, expect, it } from "vitest";
import { decide, selectDogMood, bloodPressureProgress, firstReadingOf, mentionsPossibleSideEffect } from "../../shared/rules.js";
import type { AgentInput } from "../../shared/contract.js";

const base: AgentInput = {
  now: "2026-10-14T12:00:00+08:00", userId: "u", dog: { id: "d", name: "Buddy", heart: 2, streak: 0 },
  doses: [], healthMetrics: [], daysOfSupplyByMedicationId: {}, consecutiveMissedDays: 0,
  lastMissedDay: null, lastCheckInDay: null, caretaker: { optedIn: false, threshold: 1 },
};
const high = (systolic: number, diastolic: number, note: string | null = null, offsetHours = 0) => ({
  id: `bp-${systolic}-${diastolic}-${offsetHours}`, kind: "blood_pressure" as const, systolic, diastolic, note,
  recordedAt: new Date(Date.parse(base.now) + offsetHours * 3_600_000).toISOString(),
});

describe("deterministic decision rules", () => {
  it("nudges at 60 minutes, with a second nudge only 60 minutes after the first, and caps at two", () => {
    const dose = { id: "s", medicationId: "m", medicationName: "Fictional Tablet A", strength: null, scheduledAt: "2026-10-14T11:00:00+08:00", status: "missed" as const, eventAt: null, nudgeCount: 0, lastNudgeAt: null };
    const at59 = decide({ ...base, now: "2026-10-14T11:59:00+08:00", doses: [dose] });
    expect(at59.decision).toBe("stay_quiet");
    const at60 = decide({ ...base, now: "2026-10-14T12:00:00+08:00", doses: [dose] });
    expect(at60).toMatchObject({ decision: "nudge", ruleId: "dose_nudge_1", mood: "sleepy", scheduleId: "s", scheduledFor: dose.scheduledAt });
    expect(decide({ ...base, now: "2026-10-14T12:59:00+08:00", doses: [{ ...dose, nudgeCount: 1, lastNudgeAt: "2026-10-14T12:00:00+08:00" }] }).decision).toBe("stay_quiet");
    expect(decide({ ...base, now: "2026-10-14T13:00:00+08:00", doses: [{ ...dose, nudgeCount: 1, lastNudgeAt: "2026-10-14T12:00:00+08:00" }] }).ruleId).toBe("dose_nudge_2");
    expect(decide({ ...base, doses: [{ ...dose, nudgeCount: 2, lastNudgeAt: "2026-10-14T11:00:00+08:00" }] }).decision).toBe("stay_quiet");
  });

  it("sends one privacy-safe check-in per missed day once the caretaker's number of days is reached", () => {
    const missedYesterday = { ...base, consecutiveMissedDays: 1, lastMissedDay: "2026-10-13" };
    const result = decide({ ...missedYesterday, caretaker: { optedIn: true, threshold: 1 } });
    expect(result).toMatchObject({ decision: "nudge", ruleId: "repeated_misses_caretaker_check_in", caretakerPing: true, mood: "sleepy" });
    expect(result.observations).toMatchObject({ consecutiveMissedDays: 1, lastMissedDay: "2026-10-13" });
    expect(result.wording).not.toMatch(/Fictional Tablet [AB]/);
    // Not turned on, or fewer days than the caretaker chose: no check-in.
    expect(decide({ ...missedYesterday, caretaker: { optedIn: false, threshold: 1 } }).caretakerPing).toBe(false);
    expect(decide({ ...missedYesterday, caretaker: { optedIn: true, threshold: 2 } }).caretakerPing).toBe(false);
    // Already sent for that day: the rest of today goes on as usual (here, a celebration).
    const taken = { id: "e", scheduleId: "s", scheduledFor: base.now, event: "taken" as const, occurredAt: base.now };
    expect(decide({ ...missedYesterday, lastCheckInDay: "2026-10-13", latestDoseEvent: taken, caretaker: { optedIn: true, threshold: 1 } }).decision).toBe("celebrate");
  });

  it("celebrates taken doses, walks and streak milestones", () => {
    expect(decide({ ...base, latestDoseEvent: { id: "e", scheduleId: "s", scheduledFor: base.now, event: "taken", occurredAt: base.now } })).toMatchObject({ decision: "celebrate", mood: "joyful" });
    expect(decide({ ...base, walkFinished: true }).decision).toBe("celebrate");
    expect(decide({ ...base, streakMilestoneReached: true }).decision).toBe("celebrate");
  });

  it("reminds at five days of supply and stays quiet above the boundary", () => {
    expect(decide({ ...base, daysOfSupplyByMedicationId: { m: 4 } }).decision).toBe("restock_reminder");
    expect(decide({ ...base, daysOfSupplyByMedicationId: { m: 5 } }).decision).toBe("restock_reminder");
    expect(decide({ ...base, daysOfSupplyByMedicationId: { m: 6 } }).decision).toBe("stay_quiet");
  });

  it("turns possible side-effect notes into a doctor question", () => {
    expect(decide({ ...base, healthMetrics: [high(120, 80, "feel sleepy at night")] })).toMatchObject({ decision: "doctor_question", mood: "content" });
  });

  it("judges blood pressure against the first reading with 5 points of slack (user, 16 Oct)", () => {
    const first = high(185, 120, null, -48);
    // Same, lower, or within +5 of the first reading: no Warning.
    for (const latest of [high(185, 120), high(190, 125), high(165, 100), high(118, 78)]) {
      expect(decide({ ...base, healthMetrics: [first, latest] }).decision).toBe("stay_quiet");
    }
    // More than 5 above on either number: Warning (see_gp_soon).
    expect(decide({ ...base, healthMetrics: [first, high(191, 110)] })).toMatchObject({ decision: "see_gp_soon", ruleId: "bp_above_first_reading", mood: "attentive" });
    expect(decide({ ...base, healthMetrics: [first, high(170, 126)] }).decision).toBe("see_gp_soon");
    // One reading only: it is the first, nothing to compare.
    expect(decide({ ...base, healthMetrics: [high(200, 130)] }).decision).toBe("stay_quiet");
  });

  it("an emergency sign in the latest note is a Warning at any numbers; a headache alone is not", () => {
    // One warning for every condition (owner, 18 Oct); the line names the condition.
    expect(decide({ ...base, healthMetrics: [high(120, 80, "Chest pain")] })).toMatchObject({ decision: "see_gp_soon", ruleId: "emergency_symptom_note", wording: "Your note mentioned a sign that can be serious." });
    expect(decide({ ...base, healthMetrics: [high(120, 80, null, -48), high(191, 110)] }).wording).toBe("This reading is higher than your first reading.");
    expect(decide({ ...base, healthMetrics: [high(185, 120, "bad headache")] }).decision).toBe("stay_quiet");
    // Only the latest note counts, so an old symptom doesn't stay stuck.
    expect(decide({ ...base, healthMetrics: [high(150, 95, "Fainting", -24), high(150, 95)] }).decision).toBe("stay_quiet");
  });

  it("names a reading first, warning, keep going or good job", () => {
    const first = high(185, 120, null, -48);
    expect(bloodPressureProgress(first, first)).toBe("first");
    expect(bloodPressureProgress(high(185, 120), null)).toBe("first");
    expect(bloodPressureProgress(high(191, 120), first)).toBe("warning");
    expect(bloodPressureProgress(high(165, 100), first)).toBe("keepGoing");
    expect(bloodPressureProgress(high(120, 80), first)).toBe("goodJob");
    expect(bloodPressureProgress(high(121, 80), first)).toBe("keepGoing");
    expect(firstReadingOf([high(150, 95), first, high(160, 99, null, -24)])).toBe(first);
  });

  it("resolves only the four allowed moods", () => {
    expect(selectDogMood(4, null, base.now)).toBe("joyful");
    expect(selectDogMood(2, null, base.now)).toBe("content");
    expect(selectDogMood(1, null, base.now)).toBe("sleepy");
    expect(selectDogMood(3, { decision: "emergency_995", createdAt: base.now }, base.now)).toBe("attentive");
    // Low hearts win over every decision: the sad face (user, 16 Oct).
    for (const decision of ["emergency_995", "see_gp_soon", "restock_reminder", "doctor_question", "celebrate"] as const) {
      expect(selectDogMood(1, { decision, createdAt: base.now }, base.now)).toBe("sleepy");
      expect(selectDogMood(0, { decision, createdAt: base.now }, base.now)).toBe("sleepy");
    }
    for (const heart of [-2, 0, 1, 2, 3, 4, 9]) expect(["joyful", "content", "sleepy", "attentive"]).toContain(selectDogMood(heart, null, base.now));
  });

  it("keeps the dog joyful for 30 minutes after a celebrate decision, then reverts to heart-based mood", () => {
    const createdAt = base.now;
    const celebrate = { decision: "celebrate" as const, createdAt };
    // Within the 30-minute window — joyful
    expect(selectDogMood(3, celebrate, "2026-10-14T12:29:00+08:00")).toBe("joyful");
    // ...but low hearts always show the sad face, even inside the window (user, 16 Oct).
    expect(selectDogMood(0, celebrate, "2026-10-14T12:29:00+08:00")).toBe("sleepy");
    // At exactly 30 minutes — window has elapsed, reverts to heart-based mood
    expect(selectDogMood(3, celebrate, "2026-10-14T12:30:00+08:00")).toBe("content");
    // After 30 minutes — reverts to heart-based mood
    expect(selectDogMood(3, celebrate, "2026-10-14T12:31:00+08:00")).toBe("content");
    expect(selectDogMood(2, celebrate, "2026-10-14T12:31:00+08:00")).toBe("content");
    expect(selectDogMood(1, celebrate, "2026-10-14T12:31:00+08:00")).toBe("sleepy");
  });

  it("full hearts are always joyful, also after the celebrate window and after a 995 / GP decision (user, 16 Oct)", () => {
    const celebrate = { decision: "celebrate" as const, createdAt: base.now };
    expect(selectDogMood(4, celebrate, "2026-10-14T12:15:00+08:00")).toBe("joyful");
    expect(selectDogMood(4, celebrate, "2026-10-14T12:31:00+08:00")).toBe("joyful");
    for (const decision of ["emergency_995", "see_gp_soon", "nudge", "restock_reminder"] as const) {
      expect(selectDogMood(4, { decision, createdAt: base.now }, base.now)).toBe("joyful");
    }
    // In between (2–3 hearts) decisions still shape the mood.
    expect(selectDogMood(3, { decision: "emergency_995", createdAt: base.now }, base.now)).toBe("attentive");
    expect(selectDogMood(2, { decision: "nudge", createdAt: base.now }, base.now)).toBe("sleepy");
  });

  it("returns joyful at 4/4 hearts when there is no celebrate decision (or it expired)", () => {
    // No decision at all — 4 hearts is joyful via heartMaximum
    expect(selectDogMood(4, null, base.now)).toBe("joyful");
    // An expired celebrate decision below full hearts falls back to content
    const expiredCelebrate = { decision: "celebrate" as const, createdAt: "2026-10-14T11:00:00+08:00" };
    expect(selectDogMood(3, expiredCelebrate, base.now)).toBe("content");
  });
});

describe("possible side effect in a note (one rule for the agent and the phone)", () => {
  it("matches the configured keywords, case-insensitive; nothing for empty notes", () => {
    expect(mentionsPossibleSideEffect("Feeling a bit DIZZY")).toBe(true);
    expect(mentionsPossibleSideEffect("sleepy after lunch")).toBe(true);
    expect(mentionsPossibleSideEffect("I feel fine")).toBe(false);
    expect(mentionsPossibleSideEffect(null)).toBe(false);
  });
});
