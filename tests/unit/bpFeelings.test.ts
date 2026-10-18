import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SYMPTOM_KEYS } from "../../mobile/src/config/health.js";
import { buildBpNote } from "../../mobile/src/lib/bpNote.js";
import { EMERGENCY_SYMPTOM_KEYWORDS } from "../../shared/config.js";
import { bloodPressureProgress, decide } from "../../shared/rules.js";
import { sharedFixtures } from "../../shared/fixtures.js";

const en = JSON.parse(readFileSync(new URL("../../mobile/src/locales/en.json", import.meta.url), "utf8"));
const base = sharedFixtures[0]!.input;
const reading = (systolic: number, diastolic: number, note: string | null, recordedAt: string, id = `bp-${recordedAt}`) =>
  ({ id, kind: "blood_pressure" as const, systolic, diastolic, note, recordedAt });

describe("How do you feel? tick boxes", () => {
  it("every symptom label contains one of the rule's emergency words, so a tick reaches the agent", () => {
    for (const key of SYMPTOM_KEYS) {
      const label = String(en.health.symptoms[key]).toLowerCase();
      expect(EMERGENCY_SYMPTOM_KEYWORDS.some((word) => label.includes(word))).toBe(true);
    }
    expect(typeof en.health.symptoms.fine).toBe("string");
  });

  it("builds the saved note from ticks then her words", () => {
    expect(buildBpNote(["Chest pain", "Fainting"], " felt odd ")).toBe("Chest pain, Fainting. felt odd");
    expect(buildBpNote(["I feel fine"], "")).toBe("I feel fine");
    expect(buildBpNote([], "  ")).toBeNull();
  });

  it("a ticked emergency sign warns at normal numbers; 'I feel fine' does not", () => {
    const at = base.now;
    expect(decide({ ...base, healthMetrics: [reading(120, 80, buildBpNote([en.health.symptoms.chestPain], ""), at)] })).toMatchObject({ decision: "see_gp_soon", ruleId: "emergency_symptom_note" });
    expect(decide({ ...base, healthMetrics: [reading(120, 80, buildBpNote([en.health.symptoms.fine], ""), at)] }).decision).not.toBe("see_gp_soon");
  });

  it("the phone's local copy of the first reading still counts as the first", () => {
    const server = reading(185, 120, null, "2026-10-14T10:00:00.000Z", "server-id");
    const local = reading(185, 120, null, "2026-10-14T10:00:20.000Z", "bp-1760436020000");
    expect(bloodPressureProgress(local, server)).toBe("first");
  });
});
