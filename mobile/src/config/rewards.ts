/** Lifetime-heart thresholds for wardrobe and world unlocks.
 *  Items not listed here are always unlocked.
 */
/** Shown locked with "Coming soon" whatever the hearts (user, 16 Oct: sunglasses and hibiscus placement still need tuning). */
export const COMING_SOON: readonly string[] = ["glasses", "flower"];

/** en.json key for each coming-soon item's note ({{name}} = caretaker). The hibiscus will be a gift from the caretaker. */
export const COMING_SOON_NOTE: Readonly<Record<string, string>> = {
  glasses: "customize.comingSoon",
  flower: "customize.comingSoonGift",
};

export const REWARD_THRESHOLDS: Record<string, number> = {
  hat: 20,
  glasses: 40,
  beach: 80,
  playground: 160,
};
