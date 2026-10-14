/**
 * T2-09: Souvenir thresholds derived from cumulative walk distance.
 * Thresholds live here, not in UI components. Singapore landmarks.
 * All distances are in meters. Fictional/demo values.
 */
export interface SouvenirTier {
  key: string;
  name: string;
  note: string;
  cumulativeMeters: number;
}

export const SOUVENIR_TIERS: readonly SouvenirTier[] = [
  { key: "marina_bay", name: "Marina Bay sparkle", note: "Walked 1 km together", cumulativeMeters: 1_000 },
  { key: "botanic_gardens", name: "Botanic Gardens leaf", note: "Walked 3 km together", cumulativeMeters: 3_000 },
  { key: "east_coast", name: "East Coast breeze", note: "Walked 5 km together", cumulativeMeters: 5_000 },
  { key: "sentosa", name: "Sentosa sunset", note: "Walked 10 km together", cumulativeMeters: 10_000 },
  { key: "macritchie", name: "MacRitchie trail", note: "Walked 21 km together", cumulativeMeters: 21_000 },
] as const;

/**
 * Returns souvenir keys that should be unlocked given a cumulative distance.
 */
export function unlockedSouvenirs(cumulativeMeters: number): string[] {
  return SOUVENIR_TIERS.filter((tier) => cumulativeMeters >= tier.cumulativeMeters).map((tier) => tier.key);
}

/**
 * Returns the next locked souvenir to show as a progress target, or null if all unlocked.
 */
export function nextSouvenir(cumulativeMeters: number): SouvenirTier | null {
  return SOUVENIR_TIERS.find((tier) => cumulativeMeters < tier.cumulativeMeters) ?? null;
}
