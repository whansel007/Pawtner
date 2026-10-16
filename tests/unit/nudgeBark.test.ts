import { describe, expect, it } from "vitest";
import { shouldBarkFor } from "../../mobile/src/lib/nudgeBark.js";

describe("bark on a new dose nudge", () => {
  it("barks for a nudge it hasn't seen", () => {
    expect(shouldBarkFor({ id: "n2", decision: "nudge" }, "n1")).toBe(true);
    expect(shouldBarkFor({ id: "n1", decision: "nudge" }, null)).toBe(true);
  });

  it("stays quiet for the decision already seen, other kinds, or nothing", () => {
    expect(shouldBarkFor({ id: "n1", decision: "nudge" }, "n1")).toBe(false);
    for (const kind of ["celebrate", "emergency_995", "see_gp_soon", "restock_reminder", "stay_quiet"]) {
      expect(shouldBarkFor({ id: "x", decision: kind }, null)).toBe(false);
    }
    expect(shouldBarkFor(null, null)).toBe(false);
  });
});
