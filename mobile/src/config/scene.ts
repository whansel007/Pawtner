import type { DogMood } from "../../../shared/contract";

/**
 * One place for every scene asset and look. Swap images here, not in components.
 * Image dimensions are never assumed: backdrops use object-fit cover, the dog keeps its own aspect ratio.
 */

export type DayPhase = "day" | "night";

/** Phase is fixed to day until T2-10 (sun / moon by local time) ships its shared helper. */
export const DEFAULT_PHASE: DayPhase = "day";

export const BACKDROP_BY_PHASE: Record<DayPhase, string> = {
  day: "/assets/garden-day.webp",
  night: "/assets/garden-night.webp",
};

/** One pose today; drop per-mood images in here later without touching components. */
export const DOG_IMAGE_BY_MOOD: Record<DogMood, string> = {
  joyful: "/assets/dog-base.png",
  content: "/assets/dog-base.png",
  sleepy: "/assets/dog-base.png",
  attentive: "/assets/dog-base.png",
};

/**
 * TENTATIVE starting values, no design spec yet.
 * glow: opacity of the soft light behind the dog. playful: whether tap wiggle is allowed.
 * Motion itself lives in DogStage.css, keyed by mood class, transform/opacity only.
 */
export const MOOD_LOOKS: Record<DogMood, { glow: number; playful: boolean }> = {
  joyful: { glow: 0.85, playful: true },
  content: { glow: 0.6, playful: true },
  sleepy: { glow: 0.35, playful: true },
  attentive: { glow: 0.25, playful: false },
};
