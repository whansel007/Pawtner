import type { DogMood } from "../../../shared/contract.js";

/** Caretaker web assets. The dog comes from config/scene.ts (DOG_IMAGE_BY_MOOD), like on the phone. */

/** Felt garden from the /care design, 1920×800 WebP with a transparent sky. */
export const CARE_GARDEN_IMAGE = "/assets/care-garden.webp";

/**
 * The logged-out landing is everybody's page, so its Buddy is always this look, never the signed-in senior's
 * live mood (user, 16 Oct: only the signed-in dashboard is personal and follows Rose's Buddy).
 */
export const LANDING_DOG_MOOD = "content" satisfies DogMood;

/**
 * The demo video (user, 16 Oct). "Watch the demo video" in every /care footer opens /care/video, which plays this
 * YouTube link embedded on our own page (lib/video.ts). "#" hides the footer link.
 */
export const DEMO_VIDEO_URL: string = "https://youtu.be/xlip3x6tUjk";
