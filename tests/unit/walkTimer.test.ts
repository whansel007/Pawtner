import { describe, expect, it } from "vitest";
import { elapsedSeconds, formatDuration } from "../../mobile/src/lib/walkTimer.js";

describe("Start walk timer", () => {
  const start = "2026-10-18T01:00:00.000Z";

  it("counts whole seconds from the start", () => {
    expect(elapsedSeconds(start, start)).toBe(0);
    expect(elapsedSeconds(start, "2026-10-18T01:00:00.999Z")).toBe(0);
    expect(elapsedSeconds(start, "2026-10-18T01:00:01.000Z")).toBe(1);
    expect(elapsedSeconds(start, "2026-10-18T01:18:24.400Z")).toBe(1104);
  });

  it("never goes below zero, and unreadable times give zero", () => {
    expect(elapsedSeconds(start, "2026-10-18T00:59:00.000Z")).toBe(0);
    expect(elapsedSeconds("not a time", start)).toBe(0);
  });

  it("formats mm:ss, minutes past an hour keep counting", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(2)).toBe("00:02");
    expect(formatDuration(1104)).toBe("18:24");
    expect(formatDuration(4503)).toBe("75:03");
    expect(formatDuration(9.9)).toBe("00:09");
    expect(formatDuration(-3)).toBe("00:00");
  });
});
