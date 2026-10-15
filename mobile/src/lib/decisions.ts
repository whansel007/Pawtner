import type { AgentDecision } from "../../../shared/contract.js";
import { RULES_WITH_PLAIN_REASON, URGENT_DECISIONS, WHY_OBSERVATIONS, type ObservationFormat } from "../config/decisions.js";

/**
 * Decision placement and the plain-language "Why?" (pure, no React, no i18n), shared by Home, Milestones,
 * DecisionLogCard and the unit tests.
 */

/** Urgent / safety decisions stay on Home. */
export function isUrgentDecision(decision: Pick<AgentDecision, "decision"> | null): boolean {
  return decision !== null && URGENT_DECISIONS.includes(decision.decision);
}

/** The decision Home shows (urgent only), or null. */
export function homeDecision<T extends Pick<AgentDecision, "decision">>(decision: T | null): T | null {
  return isUrgentDecision(decision) ? decision : null;
}

/** The decision Milestones shows at its top (routine only), or null. */
export function routineDecision<T extends Pick<AgentDecision, "decision">>(decision: T | null): T | null {
  return decision !== null && !isUrgentDecision(decision) ? decision : null;
}

/** One line of "What it noticed": an en.json label key and a value to format. */
export interface WhyFact {
  /** en.json key for the label (decisionLog.observation.<key>). */
  labelKey: string;
  format: ObservationFormat;
  value: string | number | boolean;
}

export interface DecisionWhy {
  /** en.json key for the plain reason: decisionLog.why.<ruleId>, or decisionLog.why.generic. */
  reasonKey: string;
  facts: WhyFact[];
}

function isShowable(format: ObservationFormat, value: unknown): value is string | number | boolean {
  if (format === "yesNo") return typeof value === "boolean";
  if (format === "number") return typeof value === "number" && Number.isFinite(value);
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

/**
 * The plain-language "Why?" for a decision: a reason sentence key (never the rule id) and only the
 * observations listed in config/decisions.ts WHY_OBSERVATIONS whose value fits their format.
 * The decision's scheduledFor (a dose time) is listed too when present.
 */
export function explainDecision(decision: Pick<AgentDecision, "ruleId" | "observations" | "scheduledFor">): DecisionWhy {
  const reasonKey = RULES_WITH_PLAIN_REASON.includes(decision.ruleId)
    ? `decisionLog.why.${decision.ruleId}`
    : "decisionLog.why.generic";
  const entries: [string, unknown][] = Object.entries(decision.observations);
  if (decision.scheduledFor && !("scheduledFor" in decision.observations)) entries.push(["scheduledFor", decision.scheduledFor]);
  const facts: WhyFact[] = [];
  for (const [key, value] of entries) {
    const format = WHY_OBSERVATIONS[key];
    if (!format || !isShowable(format, value)) continue;
    facts.push({ labelKey: `decisionLog.observation.${key}`, format, value });
  }
  return { reasonKey, facts };
}
