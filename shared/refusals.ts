import { REFUSAL_RULES } from "./config.js";
import type { AgentDecision, DogMood, RefusalKind } from "./contract.js";
import { selectDogMood } from "./rules.js";

const detectors: Array<{ kind: RefusalKind; patterns: RegExp[] }> = [
  { kind: "double_dose", patterns: [/take (?:two|2)/i, /double (?:the )?dose/i, /two doses/i] },
  { kind: "change_medication", patterns: [/(?:change|skip|stop|reduce|increase) (?:my |the )?(?:medicine|medication|dose)/i] },
  { kind: "reading_reassurance", patterns: [/(?:is|are) (?:my |this )?reading (?:fine|okay|ok|normal)/i, /what does my reading mean/i] },
  { kind: "diagnosis", patterns: [/(?:diagnos|what do i have|do i have .+\?)/i] },
  { kind: "pill_identification", patterns: [/(?:identify|what is) (?:this |the )?(?:pill|tablet)/i, /what pill is this/i] },
  { kind: "interaction_advice", patterns: [/\binteract(?:ion)?\b/i] },
];

export function refuseRequest(text: string, now: string, heart = 2): AgentDecision | null {
  const match = detectors.find((detector) => detector.patterns.some((pattern) => pattern.test(text)));
  if (!match) return null;
  const decision: AgentDecision = {
    id: `refusal-${Date.parse(now)}`,
    decision: "stay_quiet",
    ruleId: `refusal_${match.kind}`,
    mood: "content" as DogMood,
    observations: { requestCategory: match.kind },
    reasoning: "The request falls under a refusal in PRD section 7.4.",
    wording: REFUSAL_RULES[match.kind],
    wordingSource: "template",
    caretakerPing: false,
    refused: true,
    refusalKind: match.kind,
    createdAt: now,
  };
  decision.mood = selectDogMood(heart, { decision: decision.decision });
  return decision;
}
