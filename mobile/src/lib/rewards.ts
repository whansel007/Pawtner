import { REWARD_THRESHOLDS } from "../config/rewards";

export function isUnlocked(
  itemId: string,
  heartsTotal: number,
  demoUnlockAll: boolean,
): boolean {
  if (demoUnlockAll) return true;
  const threshold = REWARD_THRESHOLDS[itemId];
  if (threshold === undefined) return true;
  return heartsTotal >= threshold;
}

export function unlockThreshold(itemId: string): number | undefined {
  return REWARD_THRESHOLDS[itemId];
}
