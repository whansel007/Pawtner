import type { Screen } from "../types/common.js";

/**
 * What the senior shares with her caretaker beyond the basics (user, 16 Oct). Demo only: a switch kept in
 * localStorage, so /care in the same browser follows it (lib/sharing.ts). Text in en.json settings.*.
 */
export const SHARING = {
  /** localStorage key: "true" / "false". */
  bloodPressureKey: "pawtner.shareBloodPressure",
  /** On for the demo, so the caretaker sees the latest reading; the senior can turn it off in Settings. */
  bloodPressureDefault: true,
} as const;

/**
 * Screens that read the caretaker summary when they open: the Weekly Summary, and the screens that name the caretakers
 * from it (Settings' row, the shared notes), so a caretaker renamed in the data shows there.
 */
export const CARE_SUMMARY_SCREENS: readonly Screen[] = ["summary", "settings", "visitNotes"];
