import { describe, expect, it } from "vitest";
import { resolveDayPhase } from "../../mobile/src/lib/dayPhase.js";

const SGT = "Asia/Singapore";

describe("resolveDayPhase", () => {
  it("follows the real clock when no demo clock is set", () => {
    expect(resolveDayPhase(null, new Date("2026-10-14T21:00:00+08:00"), SGT, "day")).toBe("night");
    expect(resolveDayPhase(null, new Date("2026-10-14T10:00:00+08:00"), SGT, "day")).toBe("day");
  });

  it("switches at 19:00 and 07:00 local time", () => {
    expect(resolveDayPhase(null, new Date("2026-10-14T18:59:00+08:00"), SGT, "day")).toBe("day");
    expect(resolveDayPhase(null, new Date("2026-10-14T19:00:00+08:00"), SGT, "day")).toBe("night");
    expect(resolveDayPhase(null, new Date("2026-10-15T06:59:00+08:00"), SGT, "day")).toBe("night");
    expect(resolveDayPhase(null, new Date("2026-10-15T07:00:00+08:00"), SGT, "day")).toBe("day");
  });

  it("uses the senior's timezone, not the device's", () => {
    // 12:00 UTC is 20:00 in Singapore.
    expect(resolveDayPhase(null, new Date("2026-10-14T12:00:00Z"), SGT, "day")).toBe("night");
  });

  it("lets the demo clock override the real clock", () => {
    const realNoon = new Date("2026-10-14T12:00:00+08:00");
    expect(resolveDayPhase("2026-10-14T22:30:00+08:00", realNoon, SGT, "day")).toBe("night");
    expect(resolveDayPhase("2026-10-14T09:00:00+08:00", new Date("2026-10-14T23:00:00+08:00"), SGT, "night")).toBe("day");
  });

  it("falls back when the timezone is unknown", () => {
    expect(resolveDayPhase(null, new Date("2026-10-14T21:00:00+08:00"), "Not/AZone", "day")).toBe("day");
  });
});
