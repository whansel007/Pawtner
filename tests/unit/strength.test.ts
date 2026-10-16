import { describe, expect, it } from "vitest";
import { formatStrength } from "../../mobile/src/lib/strength.js";

describe("medicine strength display", () => {
  it("shows HSA combination strengths with a slash, in the stored order", () => {
    expect(formatStrength("10 mg&&80.000mg")).toBe("10 mg / 80.000mg");
    expect(formatStrength("5mg&&40mg")).toBe("5mg / 40mg");
    expect(formatStrength("80 mg / 10 mg")).toBe("80 mg / 10 mg");
  });

  it("leaves a single strength alone and gives an empty string for none", () => {
    expect(formatStrength("20 mg")).toBe("20 mg");
    expect(formatStrength(null)).toBe("");
    expect(formatStrength(undefined)).toBe("");
    expect(formatStrength("&&")).toBe("");
  });
});
