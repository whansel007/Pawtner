/**
 * The note saved with a blood-pressure reading: the ticked feelings first (their en.json labels), then her own words.
 * Pure, so the label → note → rule path can be tested.
 */
export function buildBpNote(tickedLabels: readonly string[], typed: string): string | null {
  const text = [tickedLabels.join(", "), typed.trim()].filter(Boolean).join(". ");
  return text || null;
}
