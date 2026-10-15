/**
 * Where the agent's decisions show, and what the "Why?" panel may show. No decision kinds inside components.
 */
import type { DecisionKind } from "../../../shared/contract.js";

/**
 * Urgent / safety decisions: they stay on Home (under the next-dose card) so they can't be missed.
 * Every other decision is routine and shows at the top of Milestones instead, so Buddy gets Home's space.
 * TENTATIVE: doctor_question (a possible side effect, asked at the next visit) is treated as routine.
 */
export const URGENT_DECISIONS: readonly DecisionKind[] = ["emergency_995", "see_gp_soon"];

/**
 * Observations the "Why?" panel may list, with how to show the value. Labels are en.json
 * decisionLog.observation.<key>. Anything not listed (ids such as scheduleId or medicationId, or a
 * field the panel doesn't know yet) is never shown, so no machine names or ids reach the senior.
 * "time": an ISO timestamp, shown as a local day and time in the senior's timezone.
 */
export type ObservationFormat = "yesNo" | "number" | "time";

export const WHY_OBSERVATIONS: Readonly<Record<string, ObservationFormat>> = {
  symptomDetected: "yesNo",
  highReading: "yesNo",
  systolic: "number",
  diastolic: "number",
  qualifyingReadings: "number",
  windowDays: "number",
  noteRecordedAt: "time",
  consecutiveMissedDoses: "number",
  caretakerThreshold: "number",
  scheduledFor: "time",
  nudgeCount: "number",
  daysOfSupply: "number",
  doseTaken: "yesNo",
  walkFinished: "yesNo",
  streakMilestoneReached: "yesNo",
  heart: "number",
};

/**
 * Rule ids that have a plain-language reason in en.json (decisionLog.why.<ruleId>). Any other rule shows
 * decisionLog.why.generic, never its id. Rule ids come from shared/rules.ts.
 */
export const RULES_WITH_PLAIN_REASON: readonly string[] = [
  "emergency_symptom_note",
  "bp_high_with_symptom",
  "bp_high_without_symptom",
  "repeated_high_readings_7d",
  "possible_side_effect_note",
  "repeated_misses_caretaker_check_in",
  "dose_nudge_1",
  "dose_nudge_2",
  "low_days_of_supply",
  "care_milestone_completed",
  "nothing_needs_attention",
];
