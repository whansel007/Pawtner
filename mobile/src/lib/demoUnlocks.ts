import { DEMO_UNLOCKS, type DemoUnlockKey } from "../config/demo.js";
import { TRICK_STREAK_DAYS } from "../config/tricks.js";

/**
 * Settings > Demo tick boxes (pure). Each tick raises one number for unlocking only; nothing is saved and the
 * real streak and hearts shown elsewhere don't change.
 */

function tickedValue(ticked: ReadonlySet<DemoUnlockKey>, kind: "streakDays" | "hearts"): number {
  return DEMO_UNLOCKS.filter((unlock) => unlock.kind === kind && ticked.has(unlock.key))
    .reduce((max, unlock) => Math.max(max, unlock.value), 0);
}

/** Lifetime hearts for unlocking wardrobe and worlds: the real total, or more if a hearts tick says so. */
export function demoHeartsTotal(real: number, ticked: ReadonlySet<DemoUnlockKey>): number {
  return Math.max(real, tickedValue(ticked, "hearts"));
}

/** Tricks with a streak-day tick applied: a trick counts as earned when its days are within the ticked streak. */
export function withDemoStreak<T extends { name: string; earned: boolean }>(tricks: readonly T[], ticked: ReadonlySet<DemoUnlockKey>): T[] {
  const days = tickedValue(ticked, "streakDays");
  return tricks.map((trick) => {
    const needed = TRICK_STREAK_DAYS[trick.name];
    return !trick.earned && needed !== undefined && needed <= days ? { ...trick, earned: true } : trick;
  });
}
