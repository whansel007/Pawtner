import { describe, expect, it } from "vitest";
import { formatLogDay, formatLogTime, groupReadingsByDay, logSecondLine } from "../../mobile/src/lib/bpLog.js";
import { bpCardLineKey, isWarningReading, readingLineKey } from "../../mobile/src/lib/decisions.js";
import { readingStatus } from "../../shared/rules.js";
import type { HealthMetric } from "../../shared/contract.js";

const TZ = "Asia/Singapore";
const NOW = "2026-10-19T04:00:00.000Z"; // 12:00 SGT, Mon 19 Oct
const reading = (id: string, recordedAt: string, systolic: number, diastolic: number, note: string | null = null): HealthMetric =>
  ({ id, kind: "blood_pressure", systolic, diastolic, note, recordedAt });
const first = reading("first", "2026-10-12T01:00:00.000Z", 160, 95);

describe("blood-pressure log: days", () => {
  it("groups by the senior's day, newest day and newest reading first; Today / Yesterday / earlier", () => {
    const readings = [
      reading("a", "2026-10-19T01:00:00.000Z", 140, 80), // 09:00 19 Oct
      reading("b", "2026-10-18T15:59:00.000Z", 150, 90), // 23:59 18 Oct
      reading("c", "2026-10-19T03:00:00.000Z", 138, 82), // 11:00 19 Oct
      reading("d", "2026-10-16T02:00:00.000Z", 145, 85), // 16 Oct
      reading("e", "2026-10-18T16:00:00.000Z", 130, 80), // 00:00 19 Oct
    ];
    const days = groupReadingsByDay(readings, NOW, TZ);
    expect(days.map((day) => [day.day, day.when, day.readings.map((r) => r.id)])).toEqual([
      ["2026-10-19", "today", ["c", "a", "e"]],
      ["2026-10-18", "yesterday", ["b"]],
      ["2026-10-16", "earlier", ["d"]],
    ]);
  });

  it("no readings → no days (the empty state)", () => {
    expect(groupReadingsByDay([], NOW, TZ)).toEqual([]);
  });

  it("formats an earlier day as 'Fri 16 Oct' and a time in the senior's zone", () => {
    expect(formatLogDay("2026-10-16", "en")).toBe("Fri 16 Oct");
    expect(formatLogTime("2026-10-19T01:05:00.000Z", "en", TZ)).toBe("9:05 AM");
  });
});

describe("one status line for the card and the log (never 'Good job' on a warning)", () => {
  it("an emergency sign at normal numbers gets the warning's line", () => {
    const sign = reading("s", "2026-10-19T01:00:00.000Z", 118, 76, "Chest pain");
    expect(readingStatus(sign, first)).toBe("emergencySign");
    expect(readingLineKey(sign, first)).toBe("decisionLog.why.emergency_symptom_note");
  });

  it("numbers decide otherwise: first / keep at it / good job / higher than the first reading", () => {
    expect(readingLineKey(first, first)).toBe("health.bpProgress.first");
    expect(readingLineKey(reading("k", NOW, 150, 90), first)).toBe("health.bpProgress.keepGoing");
    expect(readingLineKey(reading("g", NOW, 118, 76), first)).toBe("health.bpProgress.goodJob");
    expect(readingLineKey(reading("w", NOW, 185, 120), first)).toBe("health.bpProgress.warning");
  });

  it("the Blood Pressure card follows a warning decision, else the reading's own line", () => {
    const sign = reading("s", NOW, 118, 76, "Fainting");
    expect(bpCardLineKey(reading("g", NOW, 118, 76), first, { ruleId: "bp_above_first_reading" })).toBe("decisionLog.why.bp_above_first_reading");
    expect(bpCardLineKey(sign, first, null)).toBe("decisionLog.why.emergency_symptom_note");
    expect(bpCardLineKey(null, first, null)).toBeNull();
  });
});

describe("log: only the important stuff", () => {
  it("a 'Warning' label only for a reading higher than the first, or with an emergency sign in its note", () => {
    expect(isWarningReading(reading("w", NOW, 185, 120), first)).toBe(true);
    expect(isWarningReading(reading("s", NOW, 118, 76, "Shortness of breath"), first)).toBe(true);
    expect(isWarningReading(reading("k", NOW, 150, 90), first)).toBe(false);
    expect(isWarningReading(reading("g", NOW, 118, 76, "I feel fine"), first)).toBe(false);
    expect(isWarningReading(first, first)).toBe(false);
  });
});

describe("log card: one second line, no interpretation", () => {
  it("higher than the first reading, no note → the 'higher' line only", () => {
    expect(logSecondLine(reading("h", NOW, 185, 120), first)).toEqual({ reasonKey: "health.bpProgress.warning", note: null });
  });
  it("higher + her note → both", () => {
    expect(logSecondLine(reading("h", NOW, 185, 120, "Headache"), first)).toEqual({ reasonKey: "health.bpProgress.warning", note: "Headache" });
  });
  it("an emergency tick at normal numbers → her ticked condition only (it is the reason)", () => {
    expect(logSecondLine(reading("e", NOW, 118, 76, "Chest pain"), first)).toEqual({ reasonKey: null, note: "Chest pain" });
  });
  it("'I feel fine' → as written", () => {
    expect(logSecondLine(reading("f", NOW, 138, 80, "I feel fine"), first)).toEqual({ reasonKey: null, note: "I feel fine" });
  });
  it("no note → nothing (the line's space is still reserved)", () => {
    expect(logSecondLine(reading("n", NOW, 138, 80), first)).toEqual({ reasonKey: null, note: null });
    expect(logSecondLine(reading("b", NOW, 138, 80, "   "), first)).toEqual({ reasonKey: null, note: null });
  });
});
