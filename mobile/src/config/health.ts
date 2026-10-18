import { DEMO_RULES } from "../../../shared/config.js";
/**
 * Health screen settings. Text lives in en.json; links and the Healthy 365 logo live in mock/home.ts.
 */

/**
 * Clinic memo photo (From the Doctor): kept on this phone only. No upload, no reading of the memo,
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

/**
 * "For my next visit": the senior's own notes to bring to the doctor. Kept on this phone only (no API,
 * not shown on /care); text in en.json under "visitNotes".
 */
export const VISIT_NOTES = {
  /** localStorage key; a JSON array of VisitNote, newest first. */
  storageKey: "pawtner.visitNotes",
  /** Longest note, in characters (one value with the API: shared/config.ts). */
  maxLength: DEMO_RULES.visitNoteMaxLength,
} as const;

/**
 * Blood-pressure form tick boxes (user, 16 Oct): emergency signs people wouldn't think to type. Ticked labels are
 * written into the reading's note, where the agent's rule finds them (shared/config.ts EMERGENCY_SYMPTOM_KEYWORDS;
 * each en.json label must contain one of those words, tested). "fine" is the neutral choice and clears the others.
 */
export const SYMPTOM_KEYS = ["chestPain", "breath", "fainting", "confusion", "weakness", "speech"] as const;
export type SymptomKey = (typeof SYMPTOM_KEYS)[number];
