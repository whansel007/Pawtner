import { REWARD_THRESHOLDS } from "../config/rewards.js";

/** `heartsTotal` already includes any Demo hearts tick (lib/demoUnlocks.ts demoHeartsTotal). */
export function isUnlocked(itemId: string, heartsTotal: number): boolean {
  const threshold = REWARD_THRESHOLDS[itemId];
  if (threshold === undefined) return true;
  return heartsTotal >= threshold;
}

export function unlockThreshold(itemId: string): number | undefined {
  return REWARD_THRESHOLDS[itemId];
}
