import type { AgentDecision, AgentInput } from "./contract.js";

export interface AgentFixture {
  name: string;
  input: AgentInput;
  expected: Pick<AgentDecision, "decision" | "ruleId" | "mood" | "caretakerPing">;
}

const baseInput: AgentInput = {
  now: "2026-10-14T10:00:00+08:00",
  userId: "user-demo-001",
  dog: { id: "dog-demo-001", name: "Buddy", heart: 2, streak: 0 },
  doses: [],
  latestDoseEvent: null,
  healthMetrics: [],
  daysOfSupplyByMedicationId: {},
  consecutiveMissedDays: 0,
  lastMissedDay: null,
  lastCheckInDay: null,
  caretaker: { optedIn: false, threshold: 1 },
};

export const sharedFixtures: AgentFixture[] = [
  {
    name: "missed-dose-nudge",
    input: {
      ...baseInput,
      doses: [{ id: "schedule-am", medicationId: "med-a", medicationName: "Fictional Tablet A", strength: "5 mg", scheduledAt: "2026-10-14T09:00:00+08:00", status: "missed", eventAt: null, nudgeCount: 0, lastNudgeAt: null }],
    },
    expected: { decision: "nudge", ruleId: "dose_nudge_1", mood: "content", caretakerPing: false },
  },
  {
    name: "caretaker-check-in",
    input: {
      ...baseInput,
      consecutiveMissedDays: 1,
      lastMissedDay: "2026-10-13",
      caretaker: { optedIn: true, threshold: 1 },
      doses: [{ id: "schedule-am", medicationId: "med-a", medicationName: "Fictional Tablet A", strength: null, scheduledAt: "2026-10-14T08:00:00+08:00", status: "missed", eventAt: null, nudgeCount: 2, lastNudgeAt: "2026-10-14T09:00:00+08:00" }],
    },
    expected: { decision: "nudge", ruleId: "repeated_misses_caretaker_check_in", mood: "content", caretakerPing: true },
  },
  {
    name: "emergency-995",
    input: {
      ...baseInput,
      // Emergency sign ticked on the BP form (lands in the note): the one warning whatever the numbers (owner, 18 Oct).
      healthMetrics: [{ id: "bp-emergency", kind: "blood_pressure", systolic: 150, diastolic: 95, note: "Chest pain", recordedAt: "2026-10-14T10:00:00+08:00" }],
    },
    expected: { decision: "see_gp_soon", ruleId: "emergency_symptom_note", mood: "attentive", caretakerPing: false },
  },
  {
    name: "see-gp-soon",
    input: {
      ...baseInput,
      // First reading 185/120; the latest is more than 5 above it on the top number.
      healthMetrics: [
        { id: "bp-first", kind: "blood_pressure", systolic: 185, diastolic: 120, note: null, recordedAt: "2026-10-12T10:00:00+08:00" },
        { id: "bp-high", kind: "blood_pressure", systolic: 192, diastolic: 118, note: null, recordedAt: "2026-10-14T10:00:00+08:00" },
      ],
    },
    expected: { decision: "see_gp_soon", ruleId: "bp_above_first_reading", mood: "attentive", caretakerPing: false },
  },
];
