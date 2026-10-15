import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { explainDecision, homeDecision, isUrgentDecision, routineDecision } from "../../mobile/src/lib/decisions.js";
import { RULES_WITH_PLAIN_REASON, WHY_OBSERVATIONS } from "../../mobile/src/config/decisions.js";
import { decide } from "../../shared/rules.js";
import { sharedFixtures } from "../../shared/fixtures.js";
import type { DecisionKind } from "../../shared/contract.js";

const en = JSON.parse(readFileSync(new URL("../../mobile/src/locales/en.json", import.meta.url), "utf8"));

const ALL_KINDS: DecisionKind[] = ["nudge", "celebrate", "restock_reminder", "doctor_question", "see_gp_soon", "emergency_995", "stay_quiet"];

describe("decision placement", () => {
  it("emergency 995 and see-GP stay on Home; everything else goes to Milestones", () => {
    for (const kind of ALL_KINDS) {
      const urgent = kind === "emergency_995" || kind === "see_gp_soon";
      const decision = { decision: kind };
      expect(isUrgentDecision(decision)).toBe(urgent);
      expect(homeDecision(decision)).toBe(urgent ? decision : null);
      expect(routineDecision(decision)).toBe(urgent ? null : decision);
    }
    expect(homeDecision(null)).toBeNull();
    expect(routineDecision(null)).toBeNull();
  });
});

describe("explainDecision", () => {
  it("never exposes the rule id: known rules get their en.json reason, others the generic line", () => {
    expect(explainDecision({ ruleId: "care_milestone_completed", observations: {} }).reasonKey).toBe("decisionLog.why.care_milestone_completed");
    expect(explainDecision({ ruleId: "some_future_rule", observations: {} }).reasonKey).toBe("decisionLog.why.generic");
  });

  it("every plain reason and every allowed observation label exists in en.json", () => {
    for (const ruleId of [...RULES_WITH_PLAIN_REASON, "generic"]) expect(typeof en.decisionLog.why[ruleId]).toBe("string");
    for (const key of Object.keys(WHY_OBSERVATIONS)) expect(typeof en.decisionLog.observation[key]).toBe("string");
  });

  it("drops ids, unknown fields and values that don't fit their format", () => {
    const why = explainDecision({
      ruleId: "low_days_of_supply",
      observations: { medicationId: "00000000-0000-4000-8000-000000000005", daysOfSupply: 4, someMachineField: true, systolic: "high" },
    });
    expect(why.facts).toEqual([{ labelKey: "decisionLog.observation.daysOfSupply", format: "number", value: 4 }]);
  });

  it("dose nudges show the dose time, never the schedule id", () => {
    const why = explainDecision({
      ruleId: "dose_nudge_1",
      observations: { scheduleId: "sched-1", scheduledFor: "2026-10-15T00:00:00.000Z", nudgeCount: 1 },
      scheduledFor: "2026-10-15T00:00:00.000Z",
    });
    expect(why.facts.map((fact) => fact.labelKey)).toEqual(["decisionLog.observation.scheduledFor", "decisionLog.observation.nudgeCount"]);
  });

  it("every rule the engine can fire on the fixtures has a plain reason", () => {
    for (const fixture of sharedFixtures) {
      const decision = decide(fixture.input);
      expect(RULES_WITH_PLAIN_REASON).toContain(decision.ruleId);
    }
  });

  it("every rule id in shared/rules.ts has a plain reason", () => {
    const source = readFileSync(new URL("../../shared/rules.ts", import.meta.url), "utf8");
    const ruleIds = [...source.matchAll(/return decision\(input, "\w+", ([^\n]+)/g)]
      .flatMap((match) => [...match[1].matchAll(/"([a-z0-9]+(?:_[a-z0-9]+)+)"/g)].map((id) => id[1]));
    expect(ruleIds.length).toBeGreaterThanOrEqual(11);
    for (const ruleId of ruleIds) expect(RULES_WITH_PLAIN_REASON).toContain(ruleId);
  });
});
