import type { Trick, Souvenir, WorldOption, AccessoryOption } from "../types";

/**
 * Offline fallback for Milestones. Mirrors the API's trick ladder (api/repository.ts: Sit 1, Wave 7,
 * Roll over 14, New trick 30 day streak) for the mock streak of 12 days.
 */
export const tricks: Trick[] = [
  { name: "Sit", note: "1 day streak", earned: true },
  { name: "Wave", note: "7 day streak", earned: true },
  { name: "Roll over", note: "2 days to go", earned: false },
  { name: "New trick", note: "18 days to go", earned: false },
];

export const souvenirs: Souvenir[] = [
  { distance: "3.2 km", name: "Botanic Gardens leaf", note: "Walk a little farther to find it" },
];

export const worldOptions: WorldOption[] = [
  { id: "garden", label: "Garden", note: "First home" },
  { id: "beach", label: "Beach", note: "Level 1" },
  { id: "playground", label: "Playground", note: "Level 2" },
];

export const accessoryOptions: AccessoryOption[] = [
  { id: "none", label: "Fluffy", note: "accessory.justPet" },
  { id: "glasses", label: "Sunny specs", note: "" },
  { id: "hat", label: "Sun hat", note: "" },
  { id: "flower", label: "Hibiscus bloom", note: "accessory.fromCaretaker" },
];
