import { describe, expect, it } from "vitest";
import {
  demoInstantToday,
  demoNowFromSearch,
  formatClockTime,
  parseDemoTime,
  zonedDate,
  zonedTimeToInstant,
} from "../../mobile/src/lib/demoTime.js";

const SGT = "Asia/Singapore";
const PRESETS = { morning: "09:00", evening: "21:00" };

describe("parseDemoTime", () => {
  it("accepts 24-hour HH:MM and H:MM", () => {
    expect(parseDemoTime("21:00", PRESETS)).toEqual({ hour: 21, minute: 0 });
    expect(parseDemoTime("9:05", PRESETS)).toEqual({ hour: 9, minute: 5 });
    expect(parseDemoTime("00:00", PRESETS)).toEqual({ hour: 0, minute: 0 });
    expect(parseDemoTime("23:59", PRESETS)).toEqual({ hour: 23, minute: 59 });
    expect(parseDemoTime(" 21:00 ", PRESETS)).toEqual({ hour: 21, minute: 0 });
  });

  it("accepts preset names, case-insensitive", () => {
    expect(parseDemoTime("morning", PRESETS)).toEqual({ hour: 9, minute: 0 });
    expect(parseDemoTime("Evening", PRESETS)).toEqual({ hour: 21, minute: 0 });
  });

  it("rejects invalid values", () => {
    for (const value of ["", "25:00", "24:00", "21:60", "9", "2100", "21:00:00", "9pm", "noon", "-1:00", "constructor", "toString"]) {
      expect(parseDemoTime(value, PRESETS), value).toBeNull();
    }
    expect(parseDemoTime(null, PRESETS)).toBeNull();
    expect(parseDemoTime(undefined, PRESETS)).toBeNull();
  });
});

describe("formatClockTime", () => {
  it("drops the leading zero of the hour", () => {
    expect(formatClockTime({ hour: 9, minute: 0 })).toBe("9:00");
    expect(formatClockTime({ hour: 21, minute: 5 })).toBe("21:05");
  });
});

describe("zonedTimeToInstant", () => {
  it("converts 21:00 Singapore time to 13:00Z", () => {
    expect(zonedTimeToInstant({ year: 2026, month: 10, day: 15 }, { hour: 21, minute: 0 }, SGT).toISOString()).toBe("2026-10-15T13:00:00.000Z");
  });

  it("converts 09:00 Singapore time to 01:00Z", () => {
    expect(zonedTimeToInstant({ year: 2026, month: 10, day: 15 }, { hour: 9, minute: 0 }, SGT).toISOString()).toBe("2026-10-15T01:00:00.000Z");
  });

  it("crosses back over midnight UTC for early-morning times", () => {
    expect(zonedTimeToInstant({ year: 2026, month: 10, day: 15 }, { hour: 6, minute: 30 }, SGT).toISOString()).toBe("2026-10-14T22:30:00.000Z");
  });

  it("uses the daylight-saving offset in force on that date", () => {
    const nine = { hour: 9, minute: 0 };
    expect(zonedTimeToInstant({ year: 2026, month: 1, day: 15 }, nine, "America/New_York").toISOString()).toBe("2026-01-15T14:00:00.000Z");
    expect(zonedTimeToInstant({ year: 2026, month: 7, day: 15 }, nine, "America/New_York").toISOString()).toBe("2026-07-15T13:00:00.000Z");
  });

  it("throws for an unknown timezone", () => {
    expect(() => zonedTimeToInstant({ year: 2026, month: 10, day: 15 }, { hour: 9, minute: 0 }, "Not/AZone")).toThrow();
  });
});

describe("demoInstantToday", () => {
  it("uses today's date in the senior's timezone, not UTC's", () => {
    // 20:00Z on 14 Oct is already 04:00 on 15 Oct in Singapore.
    const now = new Date("2026-10-14T20:00:00Z");
    expect(zonedDate(now, SGT)).toEqual({ year: 2026, month: 10, day: 15 });
    expect(demoInstantToday({ hour: 21, minute: 0 }, now, SGT)).toBe("2026-10-15T13:00:00.000Z");
    expect(demoInstantToday({ hour: 9, minute: 0 }, now, SGT)).toBe("2026-10-15T01:00:00.000Z");
  });
});

describe("demoNowFromSearch", () => {
  const now = new Date("2026-10-15T03:00:00Z"); // 11:00 in Singapore

  it("returns the instant for a valid ?time=", () => {
    expect(demoNowFromSearch("?time=21:00", "time", PRESETS, now, SGT)).toEqual({ demoNow: "2026-10-15T13:00:00.000Z", rejected: null });
    expect(demoNowFromSearch("?foo=1&time=morning", "time", PRESETS, now, SGT)).toEqual({ demoNow: "2026-10-15T01:00:00.000Z", rejected: null });
    expect(demoNowFromSearch("?time=21%3A00", "time", PRESETS, now, SGT).demoNow).toBe("2026-10-15T13:00:00.000Z");
  });

  it("ignores a missing parameter quietly", () => {
    expect(demoNowFromSearch("", "time", PRESETS, now, SGT)).toEqual({ demoNow: null, rejected: null });
    expect(demoNowFromSearch("?other=1", "time", PRESETS, now, SGT)).toEqual({ demoNow: null, rejected: null });
  });

  it("rejects invalid values and unknown timezones", () => {
    expect(demoNowFromSearch("?time=25:00", "time", PRESETS, now, SGT)).toEqual({ demoNow: null, rejected: "25:00" });
    expect(demoNowFromSearch("?time=", "time", PRESETS, now, SGT)).toEqual({ demoNow: null, rejected: "" });
    expect(demoNowFromSearch("?time=lunch", "time", PRESETS, now, SGT)).toEqual({ demoNow: null, rejected: "lunch" });
    expect(demoNowFromSearch("?time=21:00", "time", PRESETS, now, "Not/AZone")).toEqual({ demoNow: null, rejected: "21:00" });
  });
});
