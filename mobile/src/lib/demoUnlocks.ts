import { DEMO_UNLOCKS, type DemoUnlockKey } from "../config/demo.js";
import { TRICK_STREAK_DAYS } from "../config/tricks.js";

/**
 * Settings > For demo only tick boxes (pure). Each tick raises one number for the whole phone app: the streak
 * (fire chip, Milestones, tricks) or the lifetime hearts (Milestones, wardrobe). Nothing is saved; the API's
 * numbers are untouched, so /care still shows the real ones.
 */

function tickedValue(ticked: ReadonlySet<DemoUnlockKey>, kind: "streakDays" | "hearts"): number {
  return DEMO_UNLOCKS.filter((unlock) => unlock.kind === kind && ticked.has(unlock.key))
    .reduce((max, unlock) => Math.max(max, unlock.value), 0);
}

/** Streak days shown everywhere on the phone: the real streak, or more if a days tick says so. */
export function demoStreak(real: number, ticked: ReadonlySet<DemoUnlockKey>): number {
  return Math.max(real, tickedValue(ticked, "streakDays"));
}

/** Lifetime hearts shown everywhere on the phone: the real total, or more if a hearts tick says so. */
export function demoHeartsTotal(real: number, ticked: ReadonlySet<DemoUnlockKey>): number {
  return Math.max(real, tickedValue(ticked, "hearts"));
}

/**
 * Tricks at this streak: a trick counts as earned when its days are within the streak, and its note follows the
 * same number (same wording as api/repository.ts getMilestones). Tricks the API already marks earned stay earned.
 */
export function withStreak<T extends { name: string; earned: boolean; note: string }>(tricks: readonly T[], streak: number): T[] {
  return tricks.map((trick) => {
    const needed = TRICK_STREAK_DAYS[trick.name];
    if (needed === undefined) return trick;
    if (trick.earned || needed <= streak) return { ...trick, earned: true, note: `${needed} day streak` };
    return { ...trick, note: `${needed - streak} days to go` };
  });
}
