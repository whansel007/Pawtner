/**
 * Knitted stars that twinkle over the night garden (components/NightStars.tsx).
 * TENTATIVE positions, no design spec yet.
 *
 * Every value is in ART coordinates, so the stars stay in the painted sky however the backdrop is cropped:
 *   src:    which knitted star (all 256x256, transparent; "tilted" is drawn leaning and "warm" is peach, so mixing them varies the sky).
 *   x, y:   star centre, % of the art's width / height (garden-night.webp is 923x2000; its sky is y 0-8%, trees from ~8-11%).
 *   size:   star width, % of the art's width.
 *   rotate: tilt in degrees.
 *   duration: one twinkle cycle in seconds. offset: how far into its cycle the star starts, in seconds, so they never pulse together.
 * Placed in the gaps between the eight stars painted into the art (around x 13/28/42/57/60/73/78/87 %),
 * and kept off the lower-left of the sky, where the dog's name and hearts sit on phones (they would hide a star there).
 * In portrait the whole sky (top ~8% of the art) sits behind the header row; in short landscape most of it is cropped off.
 */
export const NIGHT_STAR_IMAGES = {
  upright: "/assets/star-knit.webp",
  tilted: "/assets/star-knit-2.webp",
  /** Peach version of "upright", for a little warmth among the white stars. */
  warm: "/assets/star-knit-warm.webp",
} as const;

export type NightStar = { src: string; x: number; y: number; size: number; rotate: number; duration: number; offset: number };

const { upright, tilted, warm } = NIGHT_STAR_IMAGES;

export const NIGHT_STARS: readonly NightStar[] = [
  { src: upright, x: 6, y: 2.6, size: 3.8, rotate: -12, duration: 4.2, offset: 0 },
  { src: tilted, x: 21, y: 2.2, size: 3.4, rotate: 10, duration: 5.1, offset: 1.3 },
  { src: tilted, x: 48, y: 5, size: 4.4, rotate: -8, duration: 4.8, offset: 0.7 },
  { src: warm, x: 67, y: 6.6, size: 3.6, rotate: 14, duration: 3.9, offset: 3.1 },
  { src: warm, x: 84, y: 2.4, size: 4, rotate: -16, duration: 5.6, offset: 1.9 },
  { src: upright, x: 96, y: 7.4, size: 3.4, rotate: 6, duration: 4.5, offset: 2.8 },
];
