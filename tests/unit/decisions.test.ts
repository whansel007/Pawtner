import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bpCardLineKey, explainDecision, healthTopCard, isUrgentDecision, showSideEffectCard, SIDE_EFFECT_PROMPT } from "../../mobile/src/lib/decisions.js";
import { RULES_WITH_PLAIN_REASON } from "../../mobile/src/config/decisions.js";
import { decide } from "../../shared/rules.js";
import { DECISION_TEMPLATES } from "../../shared/templates.js";
import { sharedFixtures } from "../../shared/fixtures.js";
import type { DecisionKind } from "../../shared/contract.js";

const en = JSON.parse(readFileSync(new URL("../../mobile/src/locales/en.json", import.meta.url), "utf8"));

const ALL_KINDS: DecisionKind[] = ["nudge", "celebrate", "restock_reminder", "doctor_question", "see_gp_soon", "emergency_995", "stay_quiet"];

describe("decision placement", () => {
  it("emergency 995 and see-GP are urgent (Health's Warning card)", () => {
    for (const kind of ALL_KINDS) {
      expect(isUrgentDecision({ decision: kind })).toBe(kind === "emergency_995" || kind === "see_gp_soon");
    }
    expect(isUrgentDecision(null)).toBe(false);
  });

  it("the side-effect card shows all day after a reading note that may mention a side effect (Singapore days)", () => {
    const tz = "Asia/Singapore";
    const reading = (recordedAt: string, note: string | null) => ({ recordedAt, note });
    const morning = reading("2026-10-19T01:00:00.000Z", "Feeling a bit Dizzy today"); // 09:00 SGT, 19 Oct
    expect(showSideEffectCard([morning], "2026-10-19T01:30:00.000Z", tz)).toBe(true);
    expect(showSideEffectCard([morning], "2026-10-19T15:59:00.000Z", tz)).toBe(true); // 23:59 SGT, still 19 Oct
    expect(showSideEffectCard([morning], "2026-10-19T16:00:00.000Z", tz)).toBe(false); // 00:00 SGT, 20 Oct
    expect(showSideEffectCard([reading("2026-10-19T01:00:00.000Z", "I feel fine")], "2026-10-19T02:00:00.000Z", tz)).toBe(false);
    expect(showSideEffectCard([reading("2026-10-19T01:00:00.000Z", null)], "2026-10-19T02:00:00.000Z", tz)).toBe(false);
    expect(showSideEffectCard([], "2026-10-19T02:00:00.000Z", tz)).toBe(false);
  });

  it("the top card today: a warning first, else a side-effect note today, else nothing", () => {
    const tz = "Asia/Singapore";
    const now = "2026-10-19T03:00:00.000Z";
    const dizzy = [{ recordedAt: "2026-10-19T01:00:00.000Z", note: "a bit dizzy" }];
    const fine = [{ recordedAt: "2026-10-19T01:00:00.000Z", note: "I feel fine" }];
    const warning = { decision: "see_gp_soon" as const };
    expect(healthTopCard(warning, dizzy, now, tz)).toEqual({ kind: "warning", decision: warning });
    expect(healthTopCard({ decision: "emergency_995" as const }, fine, now, tz)?.kind).toBe("warning");
    expect(healthTopCard({ decision: "nudge" as const }, dizzy, now, tz)).toEqual({ kind: "sideEffect" });
    expect(healthTopCard(null, dizzy, now, tz)).toEqual({ kind: "sideEffect" });
    expect(healthTopCard({ decision: "celebrate" as const }, fine, now, tz)).toBeNull();
    expect(healthTopCard(null, [], now, tz)).toBeNull();
  });

  it("the BP card's line follows any warning (also an emergency sign at normal numbers), never 'Good job' under it", () => {
    const first = { id: "first", recordedAt: "2026-10-12T01:00:00.000Z", systolic: 160, diastolic: 95 };
    const normal = { id: "normal", recordedAt: "2026-10-19T01:00:00.000Z", systolic: 118, diastolic: 76 };
    const high = { id: "high", recordedAt: "2026-10-19T02:00:00.000Z", systolic: 185, diastolic: 120 };
    expect(bpCardLineKey(normal, first, { ruleId: "emergency_symptom_note" })).toBe("decisionLog.why.emergency_symptom_note");
    expect(bpCardLineKey(high, first, { ruleId: "bp_above_first_reading" })).toBe("decisionLog.why.bp_above_first_reading");
    expect(bpCardLineKey(normal, first, null)).toBe("health.bpProgress.goodJob");
    expect(bpCardLineKey(null, first, null)).toBeNull();
  });

  it("the side-effect front is the agent's own template", () => {
    expect(SIDE_EFFECT_PROMPT).toBe(DECISION_TEMPLATES.doctor_question);
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
