import i18n from "../i18n";
import type { DerivedDose } from "../../../shared/contract";

/**
 * Select the next dose the user should act on.
 *
 * Returns the earliest dose (by scheduledAt) whose status is "due" or "missed";
 * if none, the first "upcoming"; otherwise null.
 */
export function selectNextDose(doses: DerivedDose[]): DerivedDose | null {
  const actionable = doses.filter((d) => d.status === "due" || d.status === "missed");
  if (actionable.length > 0) {
    return actionable.reduce((earliest, d) =>
      d.scheduledAt < earliest.scheduledAt ? d : earliest
    );
  }

  const upcoming = doses.find((d) => d.status === "upcoming");
  return upcoming ?? null;
}

/** Count how many doses have status "taken". */
export function countTaken(doses: DerivedDose[]): number {
  return doses.filter((d) => d.status === "taken").length;
}

/**
 * Format an ISO time string for display using Intl.DateTimeFormat.
 * Uses the active i18n language; no hand-made formatting.
 */
export function formatDoseTime(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat(i18n.language, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
