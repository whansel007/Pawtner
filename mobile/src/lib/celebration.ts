/**
 * How Buddy celebrates (owner, 18 Oct: "We can use one of the available animation such as wave, or hearts (not
 * toast)", "if less than 7 days. There will be no wave"). One rule for every celebration (pure, no React):
 * - a heart earned by a walk or by the dose that completes the day's medicines: the Wave clip only when the Wave trick
 *   is earned (same earned tricks as the tap rotation) and the clip can play now; otherwise the hearts reaction;
 * - a walk that didn't reach the day's goal yet: only the bubble "Just a little bit more!", no animation (owner:
 *   "Just a little bit more no need hearts").
 * Under reduced motion (or while dizzy) there is no animation.
 */
export type CelebrationReason = "heartEarned" | "walkNotYet";

export interface Celebration {
  animation: "wave" | "hearts" | null;
  /** en.json key for Buddy's speech bubble, or null. */
  bubbleKey: string | null;
}

export function celebrationFor(
  reason: CelebrationReason,
  { waveEarned, waveCanPlay, noMotion }: { waveEarned: boolean; waveCanPlay: boolean; noMotion: boolean },
): Celebration {
  if (reason === "walkNotYet") return { animation: null, bubbleKey: "pet.walkMore" };
  if (noMotion) return { animation: null, bubbleKey: null };
  return { animation: waveEarned && waveCanPlay ? "wave" : "hearts", bubbleKey: null };
}
