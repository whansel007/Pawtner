import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { demoHeartsTotal, withDemoStreak } from "../../mobile/src/lib/demoUnlocks.js";
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
    expect(demoHeartsTotal(5, ticks("hearts20", "hearts40"))).toBe(40);
    expect(demoHeartsTotal(90, ticks("hearts40"))).toBe(90);
    expect(isUnlocked("hat", demoHeartsTotal(0, ticks("hearts20")))).toBe(true);
    expect(isUnlocked("glasses", demoHeartsTotal(0, ticks("hearts20")))).toBe(false);
    expect(isUnlocked("glasses", demoHeartsTotal(0, ticks("hearts40")))).toBe(true);
    expect(isUnlocked("flower", 0)).toBe(true);
  });

  it("the 7 days tick earns Wave only", () => {
    expect(withDemoStreak(tricks, ticks()).map((t) => t.earned)).toEqual([true, false, false]);
    expect(withDemoStreak(tricks, ticks("days7")).map((t) => t.earned)).toEqual([true, true, false]);
  });

  it("trick days match api/repository.ts trickDefs", () => {
    const source = readFileSync(new URL("../../api/repository.ts", import.meta.url), "utf8");
    for (const [name, days] of Object.entries(TRICK_STREAK_DAYS)) {
      expect(source).toContain(`{ name: "${name}", threshold: ${days},`);
    }
  });
});
