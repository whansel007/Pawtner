import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { demoHeartsTotal, demoStreak, withStreak } from "../../mobile/src/lib/demoUnlocks.js";
import { TRICK_STREAK_DAYS } from "../../mobile/src/config/tricks.js";
import { isUnlocked } from "../../mobile/src/lib/rewards.js";
import type { DemoUnlockKey } from "../../mobile/src/config/demo.js";

const ticks = (...keys: DemoUnlockKey[]) => new Set<DemoUnlockKey>(keys);
const tricks = [
  { name: "Sit", note: "1 day streak", earned: true },
  { name: "Wave", note: "5 days to go", earned: false },
  { name: "Roll over", note: "12 days to go", earned: false },
];

describe("Settings > Demo ticks", () => {
  it("hearts ticks raise the total used for unlocking, never lower it", () => {
    expect(demoHeartsTotal(5, ticks())).toBe(5);
    expect(demoHeartsTotal(5, ticks("hearts20"))).toBe(20);
    expect(demoHeartsTotal(90, ticks("hearts20"))).toBe(90);
    expect(isUnlocked("hat", demoHeartsTotal(0, ticks("hearts20")))).toBe(true);
    // Sunglasses are "Coming soon": locked at any hearts.
    expect(isUnlocked("glasses", 1000)).toBe(false);
    expect(isUnlocked("flower", 1000)).toBe(false);
  });

  it("the 7 days tick raises the one streak number, never lowers it", () => {
    expect(demoStreak(2, ticks())).toBe(2);
    expect(demoStreak(2, ticks("days7"))).toBe(7);
    expect(demoStreak(9, ticks("days7"))).toBe(9);
  });

  it("a 7-day streak earns Wave only, and the notes follow the streak", () => {
    expect(withStreak(tricks, 2).map((t) => t.earned)).toEqual([true, false, false]);
    expect(withStreak(tricks, demoStreak(2, ticks("days7"))).map((t) => [t.earned, t.note])).toEqual([
      [true, "1 day streak"], [true, "7 day streak"], [false, "7 days to go"],
    ]);
  });

  it("trick days match api/repository.ts trickDefs", () => {
    const source = readFileSync(new URL("../../api/repository.ts", import.meta.url), "utf8");
    for (const [name, days] of Object.entries(TRICK_STREAK_DAYS)) {
      expect(source).toContain(`{ name: "${name}", threshold: ${days},`);
    }
  });
});
