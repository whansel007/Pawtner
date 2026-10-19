import type { AgentDecision, HealthMetric } from "../../../shared/contract.js";
import { activeSideEffectNote, readingStatus } from "../../../shared/rules.js";
import { DECISION_TEMPLATES } from "../../../shared/templates.js";
import { RULES_WITH_PLAIN_REASON, URGENT_DECISIONS } from "../config/decisions.js";

/**
 * Decision placement and the plain-language reason (pure, no React, no i18n), shared by Health and the unit tests.
 */

/** Urgent / safety decisions (995, see a GP) show on Health. */
export function isUrgentDecision(decision: Pick<AgentDecision, "decision"> | null): boolean {
  return decision !== null && URGENT_DECISIONS.includes(decision.decision);
}

/**
 * The side-effect card when the server can't be asked (offline): a note from today only (as with no visit date).
 * Online the phone uses the server's TodayResponse.sideEffectNote, which also counts notes until the doctor's next
 * visit. Both use the one rule, shared/rules.ts activeSideEffectNote.
 */
export function showSideEffectCard(readings: readonly Pick<HealthMetric, "note" | "recordedAt">[], now: string, timeZone: string): boolean {
  return activeSideEffectNote(readings, now, timeZone, null) !== null;
}

/** Buddy's message on a side-effect day: the agent's own template, never retyped. */
export const SIDE_EFFECT_PROMPT = DECISION_TEMPLATES.doctor_question;

/**
 * The card at the top of Health today (owner, 18 Oct): a warning first (the latest decision is urgent), else a
 * side-effect note that still counts (until the doctor's next visit), else nothing. Its front is Buddy's message with "Why?"; "Why?" shows the Warning card or the
 * side-effect reason for a moment (components/PeekCard).
 */
type ReadingLike = Parameters<typeof readingStatus>[0];

/**
 * One reading's status line (en.json key), for the Blood Pressure card and every row of the blood-pressure log:
 * an emergency sign in its note gets the warning's line ("Your note mentioned a sign that can be serious."), else the
 * comparison with her first reading (first / keep at it / good job / "higher than your first reading"). A warning is
 * never "Good job" (shared/rules.ts readingStatus).
 */
export function readingLineKey(reading: ReadingLike, first: ReadingLike | null): string {
  const status = readingStatus(reading, first);
  return status === "emergencySign" ? explainDecision({ ruleId: "emergency_symptom_note" }).reasonKey : `health.bpProgress.${status}`;
}

/**
 * A reading that is a warning on its own (higher than her first reading, or an emergency sign in its note): the log's
 * small "Warning" label (owner, 18 Oct: "just the important stuff"). Same shared rule as the card's line.
 */
export function isWarningReading(reading: ReadingLike, first: ReadingLike | null): boolean {
  const status = readingStatus(reading, first);
  return status === "emergencySign" || status === "warning";
}

/**
 * The Blood Pressure card's line (en.json key), or null before any reading. On ANY warning day it follows the warning,
 * with the same condition line as the Warning face (explainDecision), never "Keep at it" / "Good job" (owner, 18 Oct:
 * no "Good job" under a Warning). Otherwise the reading's own line (readingLineKey).
 */
export function bpCardLineKey(latest: ReadingLike | null, first: ReadingLike | null, warning: Pick<AgentDecision, "ruleId"> | null): string | null {
  if (warning) return explainDecision(warning).reasonKey;
  return latest ? readingLineKey(latest, first) : null;
}

export type HealthTopCard<T> = { kind: "warning"; decision: T } | { kind: "sideEffect" } | null;

export function healthTopCard<T extends Pick<AgentDecision, "decision">>(latestDecision: T | null, sideEffectNote: boolean): HealthTopCard<T> {
  if (latestDecision && isUrgentDecision(latestDecision)) return { kind: "warning", decision: latestDecision };
  return sideEffectNote ? { kind: "sideEffect" } : null;
}

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
