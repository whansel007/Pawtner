import type { AgentDecision } from "../../../shared/contract.js";
import { HEALTH_TOP_DECISIONS, RULES_WITH_PLAIN_REASON, URGENT_DECISIONS } from "../config/decisions.js";

/**
 * Decision placement and the plain-language "Why?" (pure, no React, no i18n), shared by Health, DecisionLogCard and
 * the unit tests.
 */

/** Urgent / safety decisions (995, see a GP) show on Health. */
export function isUrgentDecision(decision: Pick<AgentDecision, "decision"> | null): boolean {
  return decision !== null && URGENT_DECISIONS.includes(decision.decision);
}

/**
 * The card at the top of Health (owner, 18 Oct: "only keep the reading note mentions a possible side effect (only if)"):
 * the latest decision when it is a doctor question (a reading note that may mention a side effect), else null.
 * No other routine decision is shown anywhere (Milestones has no decision card).
 */
export function healthTopDecision<T extends Pick<AgentDecision, "decision">>(decision: T | null): T | null {
  return decision !== null && HEALTH_TOP_DECISIONS.includes(decision.decision) ? decision : null;
}

export interface DecisionWhy {
  /** en.json key for the plain reason: decisionLog.why.<ruleId>, or decisionLog.why.generic. */
  reasonKey: string;
}

/** The plain-language "Why?" for a decision: a reason sentence key, never the rule id. */
export function explainDecision(decision: Pick<AgentDecision, "ruleId">): DecisionWhy {
  return {
    reasonKey: RULES_WITH_PLAIN_REASON.includes(decision.ruleId)
      ? `decisionLog.why.${decision.ruleId}`
      : "decisionLog.why.generic",
  };
}
