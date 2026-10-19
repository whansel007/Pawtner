import { DEMO_EXCLUSIVE_KINDS, DEMO_UNLOCKS, type DemoUnlockKey } from "../config/demo.js";
import { TRICK_STREAK_DAYS } from "../config/tricks.js";

/**
 * Settings > For demo only tick boxes (pure). Each tick raises one number for the whole phone app: the streak
 * (fire chip, Milestones, tricks) or the lifetime hearts (Milestones, wardrobe). Nothing is saved; the API's
 * numbers are untouched, so /care still shows the real ones.
 */

function tickedValue(ticked: ReadonlySet<DemoUnlockKey>, kind: (typeof DEMO_UNLOCKS)[number]["kind"]): number {
  return DEMO_UNLOCKS.filter((unlock) => unlock.kind === kind && ticked.has(unlock.key))
    .reduce((max, unlock) => Math.max(max, unlock.value), 0);
}

/** Today's hearts shown everywhere on the phone: a "Today" tick's number (higher or lower), else the real hearts. */
export function demoTodayHearts(real: number, ticked: ReadonlySet<DemoUnlockKey>): number {
  return hasDemoTodayHearts(ticked) ? tickedValue(ticked, "todayHearts") : real;
}

/** True while a "Today" hearts tick is on (the phone then works out Buddy's mood from those hearts). */
export function hasDemoTodayHearts(ticked: ReadonlySet<DemoUnlockKey>): boolean {
  return DEMO_UNLOCKS.some((unlock) => unlock.kind === "todayHearts" && ticked.has(unlock.key));
}

/** Turns a tick on or off; in an exclusive kind (today's hearts) turning one on clears the others. */
export function toggleDemoTick(ticked: ReadonlySet<DemoUnlockKey>, key: DemoUnlockKey): Set<DemoUnlockKey> {
  const next = new Set(ticked);
  if (next.has(key)) { next.delete(key); return next; }
  const kind = DEMO_UNLOCKS.find((unlock) => unlock.key === key)?.kind;
  if (kind && DEMO_EXCLUSIVE_KINDS.includes(kind)) {
    DEMO_UNLOCKS.forEach((unlock) => { if (unlock.kind === kind) next.delete(unlock.key); });
  }
  next.add(key);
  return next;
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
 * Tricks at this streak (the one live streak the phone shows, /api/today or a demo days tick): a trick counts as
 * earned exactly when its days are within the streak, and its note follows the same number (same wording as
 * api/repository.ts getMilestones). A trick the table doesn't know keeps what the API says.
 */
export function withStreak<T extends { name: string; earned: boolean; note: string }>(tricks: readonly T[], streak: number): T[] {
  return tricks.map((trick) => {
    const needed = TRICK_STREAK_DAYS[trick.name];
    if (needed === undefined) return trick;
    if (needed <= streak) return { ...trick, earned: true, note: `${needed} day streak` };
    return { ...trick, earned: false, note: `${needed - streak} days to go` };
  });
}
