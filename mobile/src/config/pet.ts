/** Pet tap-reaction configuration. No timings or paths inside components. */

export type PetReactionKind = "hop" | "hearts" | "bubble" | "bark";

export const PET_REACTIONS = {
  /** Rotation order for successive taps. */
  order: ["hop", "hearts", "bubble", "bark"] as const,
  /** Duration of each reaction in milliseconds. */
  duration: {
    hop: 600,
    hearts: 1200,
    bubble: 2400,
    bark: 800,
  } as const,
  /** Bark sound file path. Do not download or add this file yourself. */
  barkSoundPath: "/assets/bark.mp3",
  /** Whether sound is on by default. */
  soundOn: true,
} as const;

/** Reactions used when prefers-reduced-motion is active. */
export const PET_REACTIONS_REDUCED_MOTION: readonly PetReactionKind[] = ["bubble", "bark"];
