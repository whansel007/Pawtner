/**
 * What Home shows (user, 16 Oct): full-screen Buddy, both, or the full-screen form, chosen by dragging the card's grab
 * bar (portrait: up = form, down = Buddy; landscape: left = form, right = Buddy). Tapping the bar returns to both.
 * The last choice is kept on this phone. In "buddy" the card shrinks to a strip that still shows the next dose.
 */
export const HOME_VIEWS = ["buddy", "both", "medicines"] as const;

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
