import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { explainDecision, isUrgentDecision, routineDecision } from "../../mobile/src/lib/decisions.js";
import { RULES_WITH_PLAIN_REASON } from "../../mobile/src/config/decisions.js";
import { decide } from "../../shared/rules.js";
import { sharedFixtures } from "../../shared/fixtures.js";
import type { DecisionKind } from "../../shared/contract.js";

const en = JSON.parse(readFileSync(new URL("../../mobile/src/locales/en.json", import.meta.url), "utf8"));

const ALL_KINDS: DecisionKind[] = ["nudge", "celebrate", "restock_reminder", "doctor_question", "see_gp_soon", "emergency_995", "stay_quiet"];

describe("decision placement", () => {
  it("emergency 995 and see-GP are urgent (Health); everything else goes to Milestones", () => {
    for (const kind of ALL_KINDS) {
      const urgent = kind === "emergency_995" || kind === "see_gp_soon";
      const decision = { decision: kind };
      expect(isUrgentDecision(decision)).toBe(urgent);
      expect(routineDecision(decision)).toBe(urgent ? null : decision);
    }
    expect(isUrgentDecision(null)).toBe(false);
    expect(routineDecision(null)).toBeNull();
  });
});

describe("explainDecision", () => {
  it("never exposes the rule id: known rules get their en.json reason, others the generic line", () => {
    expect(explainDecision({ ruleId: "care_milestone_completed" }).reasonKey).toBe("decisionLog.why.care_milestone_completed");
    expect(explainDecision({ ruleId: "some_future_rule" }).reasonKey).toBe("decisionLog.why.generic");
  });

  it("every plain reason exists in en.json", () => {
    for (const ruleId of [...RULES_WITH_PLAIN_REASON, "generic"]) expect(typeof en.decisionLog.why[ruleId]).toBe("string");
  });

  it("every rule the engine can fire on the fixtures has a plain reason", () => {
    for (const fixture of sharedFixtures) {
      const decision = decide(fixture.input);
      expect(RULES_WITH_PLAIN_REASON).toContain(decision.ruleId);
    }
  });

  it("every rule id in shared/rules.ts has a plain reason", () => {
    const source = readFileSync(new URL("../../shared/rules.ts", import.meta.url), "utf8");
    const ruleIds = [...source.matchAll(/decision\(input, "\w+", ([^\n]+)/g)]
      .flatMap((match) => [...match[1].matchAll(/"([a-z0-9]+(?:_[a-z0-9]+)+)"/g)].map((id) => id[1]));
    expect(ruleIds.length).toBeGreaterThanOrEqual(9);
    for (const ruleId of ruleIds) expect(RULES_WITH_PLAIN_REASON).toContain(ruleId);
  });
});
