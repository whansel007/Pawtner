import { describe, expect, it, vi } from "vitest";
import { sharedFixtures } from "../../shared/fixtures.js";
import { decide } from "../../shared/rules.js";
import { applyModelWording } from "../../shared/wording.js";

describe("model wording fallback", () => {
  it("keeps template wording for every fixture with no API key", async () => {
    for (const fixture of sharedFixtures) {
      const decision = decide(fixture.input);
      const generate = vi.fn(async () => "model wording");
      expect(await applyModelWording(decision, { timeoutMs: 10, generate })).toMatchObject({ wording: decision.wording, wordingSource: "template" });
      expect(generate).not.toHaveBeenCalled();
    }
  });
  it("has template wording for every decision kind with the model disabled", async () => {
    const neutral = { ...sharedFixtures[0]!.input, doses: [], consecutiveMissedDays: 0, caretaker: { optedIn: false, threshold: 1 } };
    const inputs = [
      { ...neutral, latestDoseEvent: { id: "e", scheduleId: "s", scheduledFor: "2026-10-14T10:00:00+08:00", event: "taken" as const, occurredAt: "2026-10-14T10:00:00+08:00" } },
      { ...neutral, daysOfSupplyByMedicationId: { med: 4 } },
      { ...neutral, healthMetrics: [{ id: "bp", kind: "blood_pressure" as const, systolic: 120, diastolic: 80, note: "nausea", recordedAt: "2026-10-14T10:00:00+08:00" }] },
      { ...neutral, healthMetrics: [], daysOfSupplyByMedicationId: {} },
    ];
    const decisions = [...sharedFixtures.map((fixture) => decide(fixture.input)), ...inputs.map(decide)];
    for (const item of decisions) {
      const result = await applyModelWording(item, { timeoutMs: 10 });
      expect(result.wording.trim()).not.toBe("");
      expect(result.wordingSource).toBe("template");
    }
    expect(new Set(decisions.map((item) => item.decision))).toEqual(new Set([
      // emergency_995 is no longer decided: an emergency sign is the same warning (see_gp_soon), owner 18 Oct.
      "nudge", "see_gp_soon", "celebrate", "restock_reminder", "doctor_question", "stay_quiet",
    ]));
  });
  it("falls back after timeout or model error", async () => {
    const decision = decide(sharedFixtures[0]!.input);
    const slow = await applyModelWording(decision, { apiKey: "test-only", timeoutMs: 5, generate: () => new Promise<string>(() => {}) });
    expect(slow).toMatchObject({ wording: decision.wording, wordingSource: "template" });
    const failed = await applyModelWording(decision, { apiKey: "test-only", timeoutMs: 100, generate: async () => { throw new Error("offline"); } });
    expect(failed).toMatchObject({ wording: decision.wording, wordingSource: "template" });
  });
  it("never calls the model for a warning (any condition) or a warning saved as emergency_995", async () => {
    const emergency = decide(sharedFixtures.find((fixture) => fixture.name === "emergency-995")!.input);
    const generate = vi.fn(async () => "unsafe replacement");
    expect(await applyModelWording(emergency, { apiKey: "test-only", timeoutMs: 20, generate })).toMatchObject({ wording: emergency.wording, wordingSource: "template" });
    expect(await applyModelWording({ ...emergency, decision: "emergency_995" }, { apiKey: "test-only", timeoutMs: 20, generate })).toMatchObject({ wordingSource: "template" });
    expect(generate).not.toHaveBeenCalled();
  });
});
