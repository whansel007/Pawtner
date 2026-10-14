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
  consecutiveMissedDoses: 0,
  caretaker: { optedIn: false, threshold: 2 },
};

export const sharedFixtures: AgentFixture[] = [
  {
    name: "missed-dose-nudge",
    input: {
      ...baseInput,
      doses: [{ id: "schedule-am", medicationId: "med-a", medicationName: "Fictional Tablet A", strength: "5 mg", scheduledAt: "2026-10-14T09:00:00+08:00", status: "missed", eventAt: null, nudgeCount: 0, lastNudgeAt: null }],
    },
    expected: { decision: "nudge", ruleId: "dose_nudge_1", mood: "sleepy", caretakerPing: false },
  },
  {
    name: "caretaker-check-in",
    input: {
      ...baseInput,
      consecutiveMissedDoses: 2,
      caretaker: { optedIn: true, threshold: 2 },
      doses: [{ id: "schedule-am", medicationId: "med-a", medicationName: "Fictional Tablet A", strength: null, scheduledAt: "2026-10-14T08:00:00+08:00", status: "missed", eventAt: null, nudgeCount: 2, lastNudgeAt: "2026-10-14T09:00:00+08:00" }],
    },
    expected: { decision: "nudge", ruleId: "repeated_misses_caretaker_check_in", mood: "sleepy", caretakerPing: true },
  },
  {
    name: "emergency-995",
    input: {
      ...baseInput,
      healthMetrics: [{ id: "bp-emergency", kind: "blood_pressure", systolic: 185, diastolic: 120, note: "bad headache", recordedAt: "2026-10-14T10:00:00+08:00" }],
    },
    expected: { decision: "emergency_995", ruleId: "bp_high_with_symptom", mood: "attentive", caretakerPing: false },
  },
  {
    name: "see-gp-soon",
    input: {
      ...baseInput,
      healthMetrics: [{ id: "bp-high", kind: "blood_pressure", systolic: 180, diastolic: 80, note: null, recordedAt: "2026-10-14T10:00:00+08:00" }],
    },
    expected: { decision: "see_gp_soon", ruleId: "bp_high_without_symptom", mood: "attentive", caretakerPing: false },
  },
];
