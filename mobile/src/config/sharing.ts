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
