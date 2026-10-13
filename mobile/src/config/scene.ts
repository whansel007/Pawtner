import type { DogMood } from "../../../shared/contract";
import type { Screen } from "../types";

/**
 * One place for every scene asset, look and dog placement rule. Swap images and tune sizes here, not in components.
 */

export type DayPhase = "day" | "night";

/** Phase is fixed to day until T2-10 (sun / moon by local time) ships its shared helper. */
export const DEFAULT_PHASE: DayPhase = "day";

/**
 * Backdrop art per phase.
 * aspect: art width / height. groundLine: where the open lawn starts, as a fraction of the art height from the top.
 * The backdrop lines the ground line up with the dog's feet, so update both when the art changes.
 */
export const BACKDROP_BY_PHASE: Record<DayPhase, { src: string; aspect: number; groundLine: number }> = {
  day: { src: "/assets/garden-day.webp", aspect: 923 / 2000, groundLine: 0.36 },
  night: { src: "/assets/garden-night.webp", aspect: 923 / 2000, groundLine: 0.36 },
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

/**
 * Where the companion dog stands on each screen.
 * home: on the lawn just above the Today chips. ledge: on the top edge of the screen's content card.
 * ground: the element whose top edge is the dog's feet line.
 * minHeight / maxHeight: TENTATIVE size limits. The max keeps the small source art from upscaling into blur and dominating tall phones.
 */
export const DOG_PLACEMENTS = {
  home: { ground: ".home-layout__chips", minHeight: "clamp(120px, 26dvh, 320px)", maxHeight: "34dvh" },
  ledge: { ground: ".content-card", minHeight: "clamp(80px, 14dvh, 140px)", maxHeight: "34dvh" },
} as const;

export type DogPlacement = keyof typeof DOG_PLACEMENTS;

/** Screens without the dog: the caretaker view, and the full-screen intro which has no scene at all. */
const SCREENS_WITHOUT_DOG: readonly Screen[] = ["care", "cover", "dedication"];

export function dogPlacementFor(screen: Screen): DogPlacement | null {
  if (SCREENS_WITHOUT_DOG.includes(screen)) return null;
  return screen === "home" ? "home" : "ledge";
}
