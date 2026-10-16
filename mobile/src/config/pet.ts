import { DEMO_RULES } from "../../../shared/config.js";
/** Pet tap-reaction configuration. No timings or paths inside components. */

export type PetReactionKind = "hop" | "hearts" | "bubble" | "bark";

/** Bubble-line keys that rotate on successive bubble reactions. The lines live in en.json. */
export const BUBBLE_LINE_KEYS = ["happy1", "happy2", "happy3", "happy4"] as const;

/** en.json key for the n-th bubble (0-based), rotating through BUBBLE_LINE_KEYS. */
export function bubbleLineKey(index: number): string {
  return `pet.lines.${BUBBLE_LINE_KEYS[index % BUBBLE_LINE_KEYS.length]}`;
}

/**
 * Buddy plays (tap reactions, tricks, the wave clip) from this many hearts up (user, 16 Oct): one above the
 * shared low-heart line, where he also shows his sad face. Below it a tap shows a bubble asking for a heart
 * instead (en.json pet.lowHeart). Mood from readings (attentive) never stops play.
 */
export const PLAY_MIN_HEARTS = DEMO_RULES.lowHeartMaximum + 1;

/**
 * Decisions that make Buddy bark once when they arrive while the app is open (user, 16 Oct): the in-app stand-in
 * for a phone notification (push is Tier 3 in the PRD). Uses the same bark as taps and the paw button.
 */
export const BARK_ON_DECISIONS: readonly string[] = ["nudge"];

/** How many hearts float up on the hearts reaction (the CSS staggers up to this many). */
export const HEART_BURST_COUNT = 5;

export const PET_REACTIONS = {
  /** Rotation order for successive taps. */
  order: ["hop", "hearts", "bubble", "bark"] as const,
  /** Duration of each reaction in milliseconds. */
  duration: {
    hop: 600,
    hearts: 1400,
    bubble: 2400,
    bark: 800,
  } as const,
  /**
   * Bark sound (dog tap rotation and the paw button, via lib/useBark.ts). User-supplied from Pixabay
   * (Pixabay Content License, no attribution needed; 0.95 s, 12 KB). Don't replace it with a downloaded sound.
   */
  barkSoundPath: "/assets/bark.mp3",
  /** Whether sound is on by default. */
  soundOn: true,
} as const;

/** Reactions used when prefers-reduced-motion is active. */
export const PET_REACTIONS_REDUCED_MOTION: readonly PetReactionKind[] = ["bubble", "bark"];
