/**
 * Health screen settings. Text lives in en.json; links and the Healthy 365 logo live in mock/home.ts.
 */

/**
 * Clinic memo photo (Doctor's tiny tasks): kept on this phone only. No upload, no reading of the memo,
 * no interpretation (PRD: no clinical advice). The photo is downscaled to a JPEG data URL before it is stored.
 */
export const CLINIC_MEMO = {
  /** localStorage key; one photo at a time. */
  storageKey: "pawtner.clinicMemo",
  /** Longest edge after downscaling, in pixels (keeps the data URL well under localStorage limits). */
  maxEdgePx: 1000,
  /** JPEG quality for the stored copy, 0–1. */
  jpegQuality: 0.8,
} as const;
