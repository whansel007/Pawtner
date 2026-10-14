import { describe, it, expect } from "vitest";
import { validateRephrase } from "../../shared/medlineplus.js";

describe("medlineplus rephrase validation", () => {
  it("accepts a rephrase with no new numbers or names", () => {
    const source = "This medicine helps settle nerve pain. Take one capsule in the morning.";
    const rephrased = "It helps calm nerve pain. Have a capsule each morning.";
    expect(validateRephrase(source, rephrased).valid).toBe(true);
  });

  it("rejects a rephrase that adds a new number", () => {
    const source = "Take 1 capsule in the morning.";
    const rephrased = "Take 2 capsules in the morning.";
    const result = validateRephrase(source, rephrased);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("2");
  });

  it("rejects a rephrase that adds a new medicine name", () => {
    const source = "This medicine helps with pain. Take one tablet.";
    const rephrased = "ASPIRIN helps with pain. Take one tablet.";
    const result = validateRephrase(source, rephrased);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("ASPIRIN");
  });

  it("accepts a rephrase that uses the same all-caps names", () => {
    const source = "GABAPENTIN helps settle nerve pain. Take one capsule.";
    const rephrased = "GABAPENTIN calms nerve pain. Have a capsule.";
    expect(validateRephrase(source, rephrased).valid).toBe(true);
  });

  it("allows common English words that start with capitals", () => {
    const source = "Take one tablet. May cause drowsiness.";
    const rephrased = "Please take a tablet. This may cause drowsiness.";
    expect(validateRephrase(source, rephrased).valid).toBe(true);
  });
});
