import { describe, it, expect } from "vitest";
import { getDayPhase } from "../../shared/day-phase.js";

describe("day-phase", () => {
  it("returns day during daytime hours", () => {
    // 2026-10-14T10:00:00+08:00 = 02:00 UTC, which is 10:00 SGT
    expect(getDayPhase("2026-10-14T10:00:00+08:00", "Asia/Singapore")).toBe("day");
  });

  it("returns night during evening hours", () => {
    // 20:00 SGT
    expect(getDayPhase("2026-10-14T20:00:00+08:00", "Asia/Singapore")).toBe("night");
  });

  it("returns night before sunrise", () => {
    // 06:00 SGT
    expect(getDayPhase("2026-10-14T06:00:00+08:00", "Asia/Singapore")).toBe("night");
  });

  it("returns day just after sunrise", () => {
    // 07:00 SGT
    expect(getDayPhase("2026-10-14T07:00:00+08:00", "Asia/Singapore")).toBe("day");
  });

  it("returns night at 18:59+1 = 19:00", () => {
    // 19:00 SGT
    expect(getDayPhase("2026-10-14T19:00:00+08:00", "Asia/Singapore")).toBe("night");
  });
});
