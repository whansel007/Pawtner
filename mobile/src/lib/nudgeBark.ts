import { BARK_ON_DECISIONS } from "../config/pet.js";

/**
 * Should Buddy bark for this decision? Only for a decision kind in BARK_ON_DECISIONS that is new: not the one
 * already there when the app loaded (`seenId`), and not one he already barked for.
 */
export function shouldBarkFor(decision: { id: string; decision: string } | null, seenId: string | null): boolean {
  return decision !== null && decision.id !== seenId && BARK_ON_DECISIONS.includes(decision.decision);
}
