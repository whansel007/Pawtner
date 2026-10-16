/**
 * What Home shows (user, 16 Oct: "Buddy only or just the form only for easy usage"). Chosen in Settings and kept on
 * this phone, so a stray tap on Home never changes it. Each single view keeps one big button back to "both", and
 * "buddy" still shows the next dose time, so medicines are never out of sight. Text in en.json settings.homeView.*.
 */
export const HOME_VIEWS = ["both", "buddy", "medicines"] as const;

export type HomeView = (typeof HOME_VIEWS)[number];

export const HOME_VIEW = {
  /** localStorage key: one of HOME_VIEWS. */
  storageKey: "pawtner.homeView",
  default: "both" as HomeView,
} as const;
