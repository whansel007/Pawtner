/** Lifetime-heart thresholds for wardrobe and world unlocks.
 *  Items not listed here are always unlocked.
 */
/** Shown locked with "Coming soon" whatever the hearts (user, 16 Oct: sunglasses placement still needs tuning). */
export const COMING_SOON: readonly string[] = ["glasses"];

export const REWARD_THRESHOLDS: Record<string, number> = {
  hat: 20,
  glasses: 40,
  beach: 80,
  playground: 160,
};
