import { describe, expect, it } from "vitest";
import { refuseRequest } from "../../shared/refusals.js";

describe("PRD refusal cases", () => {
  it.each([
    ["I missed a dose, should I take two?", "double_dose"],
    ["Should I stop my medicine?", "change_medication"],
    ["Is my reading fine?", "reading_reassurance"],
    ["Can you diagnose this symptom?", "diagnosis"],
    ["Identify this pill from the photo", "pill_identification"],
    ["Will these medicines interact?", "interaction_advice"],
  ] as const)("refuses %s", (text, kind) => {
    expect(refuseRequest(text, "2026-10-14T12:00:00+08:00")).toMatchObject({ refused: true, refusalKind: kind, wordingSource: "template" });
  });
  it("does not refuse unrelated conversation", () => {
    expect(refuseRequest("Hello Max", "2026-10-14T12:00:00+08:00")).toBeNull();
  });
});
