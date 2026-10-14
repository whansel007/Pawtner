import type { DogMood } from "../../../shared/contract";
import { getDayPhase, type DayPhase } from "../../../shared/day-phase";
import type { Screen } from "../types";

/**
 * One place for every scene asset, look and dog placement rule. Swap images and tune sizes here, not in components.
 */

export type { DayPhase };

/**
 * T2-10: Sun/moon by local time. Uses the shared helper so the same logic
 * applies everywhere. Falls back to "day" if timezone is unknown.
 */
export function phaseFromTime(now: string, timezone: string): DayPhase {
  return getDayPhase(now, timezone);
}

/** Default phase used before the API reports a time. */
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
  joyful: "/assets/dog-base.webp",
  content: "/assets/dog-base.webp",
  sleepy: "/assets/dog-base.webp",
  attentive: "/assets/dog-base.webp",
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
 * Two-column scene for phones and tablets held sideways (and any short landscape window).
 * Desktop (mouse) keeps the centred portrait column. index.css repeats this query for the layout rules; keep both in sync.
 */
export const LANDSCAPE_MEDIA_QUERY =
  "(orientation: landscape) and (hover: none) and (pointer: coarse), (orientation: landscape) and (max-height: 520px)";

export type SceneLayout = "portrait" | "landscape";

/**
 * Where the companion dog stands on each screen.
 * ground: the element whose top edge is the dog's feet line.
 * minHeight / maxHeight: TENTATIVE size limits. The max keeps the small source art from upscaling into blur and dominating tall phones.
 * ledge: the screen's content card leaves room above itself (--ledge-space) so the dog can stand on its top edge.
 *
 * Portrait: home = on the lawn just above the Today chips; ledge = on the top edge of the content card.
 * Landscape: the dog stays on the lawn in the left column on every screen. homeWide = on Home's chips;
 * lawn = on the .scene-ground marker, which sits at the same height as Home's chips so the dog doesn't jump between screens.
 */
export const DOG_PLACEMENTS = {
  home: { ground: ".home-layout__chips", minHeight: "clamp(120px, 26dvh, 320px)", maxHeight: "34dvh", ledge: false },
  ledge: { ground: ".content-card", minHeight: "clamp(80px, 14dvh, 140px)", maxHeight: "34dvh", ledge: true },
  homeWide: { ground: ".home-layout__chips", minHeight: "clamp(110px, 30dvh, 300px)", maxHeight: "46dvh", ledge: false },
  lawn: { ground: ".scene-ground", minHeight: "clamp(110px, 30dvh, 300px)", maxHeight: "46dvh", ledge: false },
} as const;

export type DogPlacement = keyof typeof DOG_PLACEMENTS;

/** Screens without the dog: the caretaker view, and the full-screen intro which has no scene at all. */
const SCREENS_WITHOUT_DOG: readonly Screen[] = ["care", "cover", "dedication"];

export function dogPlacementFor(screen: Screen, layout: SceneLayout = "portrait"): DogPlacement | null {
  if (SCREENS_WITHOUT_DOG.includes(screen)) return null;
  if (layout === "landscape") return screen === "home" ? "homeWide" : "lawn";
  return screen === "home" ? "home" : "ledge";
}
