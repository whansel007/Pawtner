/**
 * Where the agent's decisions show, and which rules have a plain "Why?". No decision kinds inside components.
 */
import type { DecisionKind } from "../../../shared/contract.js";

/**
 * The warning (see a doctor; owner 18 Oct: one warning for every condition, `see_gp_soon`; `emergency_995` is only
 * on warnings saved before): it shows on Health with the blood-pressure result (user, 16 Oct: not on Home).
 * Every other decision is routine and shows at the top of Milestones.
 * TENTATIVE: doctor_question (a possible side effect, asked at the next visit) is treated as routine.
 */
export const URGENT_DECISIONS: readonly DecisionKind[] = ["emergency_995", "see_gp_soon"];

/**
 * Rule ids that have a plain-language reason in en.json (decisionLog.why.<ruleId>). Any other rule shows
 * decisionLog.why.generic, never its id. Rule ids come from shared/rules.ts.
 */
export const RULES_WITH_PLAIN_REASON: readonly string[] = [
  "emergency_symptom_note",
  "bp_above_first_reading",
  // Older rules: still explain decisions saved before 16 Oct.
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
