import { describe, expect, it } from "vitest";
import { isGoodWeek } from "../../mobile/src/lib/weekRating.js";
import { GOOD_WEEK } from "../../mobile/src/config/health.js";
import { demoStreak } from "../../mobile/src/lib/demoUnlocks.js";
import type { DemoUnlockKey } from "../../mobile/src/config/demo.js";

describe("'Good week' follows the data", () => {
  it("thresholds: a 7-day streak, or 5 of 7 caring days", () => {
    expect(GOOD_WEEK).toEqual({ streakDays: 7, caringDays: 5 });
  });

  it("shows at a 7-day streak or with 5+ caring days; otherwise no line", () => {
    expect(isGoodWeek({ streak: 7, caringDays: 0 })).toBe(true);
    expect(isGoodWeek({ streak: 0, caringDays: 5 })).toBe(true);
    expect(isGoodWeek({ streak: 6, caringDays: 4 })).toBe(false);
  });

  it("the Settings demo '7-day streak' tick makes it appear (same demoStreak as the app)", () => {
    const ticked = new Set<DemoUnlockKey>(["days7"]);
    expect(isGoodWeek({ streak: demoStreak(0, new Set()), caringDays: 2 })).toBe(false);
    expect(isGoodWeek({ streak: demoStreak(0, ticked), caringDays: 2 })).toBe(true);
  });
});
