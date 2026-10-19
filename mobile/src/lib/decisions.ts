import type { AgentDecision, HealthMetric } from "../../../shared/contract.js";
import { mentionsPossibleSideEffect } from "../../../shared/rules.js";
import { DECISION_TEMPLATES } from "../../../shared/templates.js";
import { RULES_WITH_PLAIN_REASON, URGENT_DECISIONS } from "../config/decisions.js";

/**
 * Decision placement and the plain-language reason (pure, no React, no i18n), shared by Health and the unit tests.
 */

/** Urgent / safety decisions (995, see a GP) show on Health. */
export function isUrgentDecision(decision: Pick<AgentDecision, "decision"> | null): boolean {
  return decision !== null && URGENT_DECISIONS.includes(decision.decision);
}

/** The senior's local calendar day of an instant (YYYY-MM-DD). */
function localDay(instant: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(instant));
}

/**
 * The card at the top of Health (owner, 18 Oct): it shows for the rest of the day once one of today's readings has a
 * note that may mention a possible side effect (shared/rules.ts mentionsPossibleSideEffect, the agent's own rule),
 * whatever Buddy decided after. It goes at the next day, or after Reset to morning hides that reading.
 * No other routine decision shows anywhere (Milestones has no decision card).
 */
export function showSideEffectCard(readings: readonly Pick<HealthMetric, "note" | "recordedAt">[], now: string, timeZone: string): boolean {
  const today = localDay(now, timeZone);
  return readings.some((reading) => localDay(reading.recordedAt, timeZone) === today && mentionsPossibleSideEffect(reading.note));
}

/** What the side-effect card says: the agent's own template, never retyped. Text only, no "Why?" (owner, 18 Oct). */
export const SIDE_EFFECT_PROMPT = DECISION_TEMPLATES.doctor_question;

export interface DecisionWhy {
  /** en.json key for the plain reason: decisionLog.why.<ruleId>, or decisionLog.why.generic. */
  reasonKey: string;
}

/** The plain-language reason for a decision (Health's Warning card line): a reason sentence key, never the rule id. */
export function explainDecision(decision: Pick<AgentDecision, "ruleId">): DecisionWhy {
  return {
    reasonKey: RULES_WITH_PLAIN_REASON.includes(decision.ruleId)
      ? `decisionLog.why.${decision.ruleId}`
      : "decisionLog.why.generic",
  };
}
