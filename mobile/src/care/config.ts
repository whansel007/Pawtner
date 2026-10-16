import type { DogMood } from "../../../shared/contract";

/** Caretaker web assets. The dog comes from config/scene.ts (DOG_IMAGE_BY_MOOD), like on the phone. */

/** Felt garden from the /care design, 1920×800 WebP with a transparent sky. */
export const CARE_GARDEN_IMAGE = "/assets/care-garden.webp";

/**
 * The logged-out landing is everybody's page, so its Buddy is always this look, never the signed-in senior's
 * live mood (user, 16 Oct: only the signed-in dashboard is personal and follows Rose's Buddy).
 */
export const LANDING_DOG_MOOD = "content" satisfies DogMood;

/**
 * "Watch the demo video" in the footer of every /care page, like JagaOS's footer links (user, 16 Oct). Paste the YouTube
 * link here when the video is up; until then it is "#": the link shows but does nothing when tapped. Opens in a new tab.
 */
export const DEMO_VIDEO_URL: string = "#";
