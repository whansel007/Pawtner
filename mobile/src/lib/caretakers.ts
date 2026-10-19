import type { CaregiverEntry } from "../../../shared/contract.js";

/**
 * The names of everyone caring for the senior, from the caretaker summary (in its order), or the fallback list when
 * the summary isn't there or lists nobody. Settings joins them with en.json settings.caretakerSeparator.
 */
export function caretakerNames(summary: { caregivers?: CaregiverEntry[] } | null | undefined, fallback: readonly CaregiverEntry[]): string[] {
  const listed = summary?.caregivers?.length ? summary.caregivers : fallback;
  return listed.map((entry) => entry.name);
}
