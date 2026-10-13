import { describe, expect, it } from "vitest";
import { decide, selectDogMood } from "../../shared/rules.js";
import type { AgentInput } from "../../shared/contract.js";

const base: AgentInput = {
  now: "2026-10-14T12:00:00+08:00", userId: "u", dog: { id: "d", name: "Max", heart: 2, streak: 0 },
  doses: [], healthMetrics: [], daysOfSupplyByMedicationId: {}, consecutiveMissedDoses: 0,
  caretaker: { optedIn: false, threshold: 2 },
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
    expect(at60).toMatchObject({ decision: "nudge", ruleId: "dose_nudge_1", mood: "sleepy" });
    expect(decide({ ...base, now: "2026-10-14T12:59:00+08:00", doses: [{ ...dose, nudgeCount: 1, lastNudgeAt: "2026-10-14T12:00:00+08:00" }] }).decision).toBe("stay_quiet");
    expect(decide({ ...base, now: "2026-10-14T13:00:00+08:00", doses: [{ ...dose, nudgeCount: 1, lastNudgeAt: "2026-10-14T12:00:00+08:00" }] }).ruleId).toBe("dose_nudge_2");
    expect(decide({ ...base, doses: [{ ...dose, nudgeCount: 2, lastNudgeAt: "2026-10-14T11:00:00+08:00" }] }).decision).toBe("stay_quiet");
  });

  it("sends a privacy-safe opted-in caretaker check-in at threshold two", () => {
    const result = decide({ ...base, consecutiveMissedDoses: 2, caretaker: { optedIn: true, threshold: 2 } });
    expect(result).toMatchObject({ decision: "nudge", ruleId: "repeated_misses_caretaker_check_in", caretakerPing: true, mood: "sleepy" });
    expect(result.wording).not.toMatch(/Fictional Tablet [AB]/);
    expect(decide({ ...base, consecutiveMissedDoses: 2, caretaker: { optedIn: false, threshold: 2 } }).caretakerPing).toBe(false);
  });

  it("celebrates taken doses, walks and streak milestones", () => {
    expect(decide({ ...base, latestDoseEvent: { id: "e", scheduleId: "s", event: "taken", occurredAt: base.now } })).toMatchObject({ decision: "celebrate", mood: "joyful" });
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

  it("uses 180/120 boundaries and distinguishes symptoms from no symptoms", () => {
    expect(decide({ ...base, healthMetrics: [high(179, 119)] }).decision).toBe("stay_quiet");
    expect(decide({ ...base, healthMetrics: [high(180, 80)] })).toMatchObject({ decision: "see_gp_soon", mood: "attentive" });
    expect(decide({ ...base, healthMetrics: [high(179, 120)] }).decision).toBe("see_gp_soon");
    expect(decide({ ...base, healthMetrics: [high(185, 120, "bad headache")] })).toMatchObject({ decision: "emergency_995", mood: "attentive" });
    expect(decide({ ...base, healthMetrics: [high(120, 80, "chest pain")] }).decision).toBe("emergency_995");
  });

  it("uses three qualifying readings in seven days for see-GP-soon", () => {
    const readings = [high(140, 90, null, -24), high(141, 91, null, -48), high(140, 90, null, -72)];
    expect(decide({ ...base, healthMetrics: readings })).toMatchObject({ decision: "see_gp_soon", ruleId: "repeated_high_readings_7d" });
    expect(decide({ ...base, healthMetrics: readings.slice(1) }).decision).toBe("stay_quiet");
  });

  it("resolves only the four allowed moods", () => {
    expect(selectDogMood(4, null)).toBe("joyful");
    expect(selectDogMood(2, null)).toBe("content");
    expect(selectDogMood(1, null)).toBe("sleepy");
    expect(selectDogMood(4, { decision: "emergency_995" })).toBe("attentive");
    for (const heart of [-2, 0, 1, 2, 3, 4, 9]) expect(["joyful", "content", "sleepy", "attentive"]).toContain(selectDogMood(heart, null));
  });
});
