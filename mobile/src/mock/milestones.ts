import type { MilestoneWorld, Trick, Souvenir, WalkStats, WorldOption, AccessoryOption } from "../types";

export const currentWorld: MilestoneWorld = {
  id: "kampung",
  label: "The kampung",
  note: "Level 3 reward",
  current: true,
  unlocked: true,
  levelText: "LEVEL UP · WORLD 3",
  description: "Unlocked! The flat and garden stay yours to revisit.",
  progress: 1,
};

export const tricks: Trick[] = [
  { name: "Sit", note: "7 day streak", earned: true },
  { name: "High five", note: "18 days to go", earned: false },
];

export const souvenirs: Souvenir[] = [
  { distance: "3.2 km", name: "Botanic Gardens leaf", note: "Walk a little farther to find it" },
];

export const worldOptions: WorldOption[] = [
  { id: "flat", label: "Our flat", note: "First home" },
  { id: "garden", label: "Garden", note: "Current world" },
  { id: "kampung", label: "Kampung", note: "Level 3 reward" },
];

export const accessoryOptions: AccessoryOption[] = [
  { id: "none", label: "Fluffy", note: "Just Max" },
  { id: "glasses", label: "Sunny specs", note: "3 walks" },
  { id: "hat", label: "Sun hat", note: "7 day streak" },
  { id: "flower", label: "Hibiscus bloom", note: "From Jamie" },
];

export const walkStats: WalkStats = {
  duration: "18:24",
  distance: "0.92 km",
  steps: "1,842",
  calories: "48",
  speed: "4.2",
  goal: "Today's goal · 30 minutes · speed check on",
};
