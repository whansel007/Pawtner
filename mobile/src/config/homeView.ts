import type { Screen } from "../types/common.js";

/**
 * What Home shows (user, 16 Oct): full-screen Buddy, both, or the full-screen form, chosen by dragging the card's grab
 * bar (portrait: up = form, down = Buddy; landscape: left = form, right = Buddy). Tapping the bar returns to both.
 * The last choice is kept on this phone. In "buddy" the card shrinks to a strip that still shows the next dose.
 */
export const HOME_VIEWS = ["buddy", "both", "medicines"] as const;
// The same three views serve the card screens below (one drag, one rule): there "medicines" means the full card.
// The values stay as they are so Home's stored choice keeps working.

export type HomeView = (typeof HOME_VIEWS)[number];

export const HOME_VIEW = {
  /** localStorage key: one of HOME_VIEWS. */
  storageKey: "pawtner.homeView",
  default: "both" as HomeView,
  /** A drag this far (px) toward a side moves one step; twice this far moves two (Buddy straight to the form). */
  snapPx: 56,
  /** The card follows the finger at most this far (px) while dragging, so it never flies off screen. */
  maxFollowPx: 160,
} as const;

/**
 * Screens whose card drags like Home's (user, 19 Oct): full card / both / full Buddy. They open in `default` every time
 * (not stored); Home keeps its own stored choice. Other card screens don't drag.
 */
export const CARD_SHEET = {
  screens: ["health", "milestones", "settings"] as readonly Screen[],
  default: "both" as HomeView,
} as const;

/** The grab bar shows where you are as short dashes in a row (user, 19 Oct): 1 = full Buddy, 2 = both, 3 = full card. */
export const SHEET_DASHES: Record<HomeView, number> = { buddy: 1, both: 2, medicines: 3 };
