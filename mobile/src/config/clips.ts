/**
 * Buddy video clips: short transparent clips that play over the still dog art, then hand back to it.
 * No paths, timings or geometry inside components.
 */
import type { DogMood } from "../../../shared/contract.js";

export type BuddyClipKind = "wave" | "joyful";

/** The same clip in two alpha formats: Safari/WebKit plays HEVC-alpha (.mov), other browsers play VP9-alpha (.webm). */
export interface ClipSources {
  webm: string;
  mov: string;
}

/**
 * Each clip is 5.2 s, 24 fps, 900x998 px, muted, and its first and last frames are the still pose,
 * so the swap between still and clip is seamless.
 * wave: content face (dog-base.webp) waves a paw. joyful: joyful face (dog-joyful.webp, tongue out) waves.
 */
export const BUDDY_CLIPS: Record<BuddyClipKind, ClipSources> = {
  wave: { webm: "/assets/buddy-wave.webm", mov: "/assets/buddy-wave.mov" },
  joyful: { webm: "/assets/buddy-joyful.webm", mov: "/assets/buddy-joyful.mov" },
};

/**
 * Clip frame geometry, in art units. A clip frame is the still art's 1000x1300 canvas padded by
 * padX on the left and right and padTop on top (1200x1330 units → 900x998 px), so the first frame
 * lies over the still. lib/buddyClips.ts turns this into the overlay box.
 */
export const CLIP_CANVAS = { padX: 100, padTop: 30, base: { w: 1000, h: 1300 } } as const;

/** Media types probed with canPlayType() to choose the clip format. */
export const CLIP_MEDIA_TYPES = {
  hevcAlpha: 'video/mp4; codecs="hvc1"',
  vp9Alpha: 'video/webm; codecs="vp9"',
} as const;

/** A clip that never reports "ended" (stalled, blocked) is stopped after this long and the still comes back. */
export const CLIP_SAFETY_TIMEOUT_MS = 7000;

/** Preload both clips this long after Home first renders if the browser has no requestIdleCallback. */
export const CLIP_PRELOAD_FALLBACK_MS = 1500;

/**
 * The clip Buddy's "Wave" trick plays, by mood (once Wave is earned; see config/tricks.ts). null = no wave:
 * the wave is skipped in the tap rotation. Sleepy has a different face. Attentive (from readings) uses the base art,
 * so it waves like content (user, 16 Oct: readings never stop play; only low hearts do).
 */
export const WAVE_CLIP_BY_MOOD: Record<DogMood, BuddyClipKind | null> = {
  content: "wave",
  joyful: "joyful",
  sleepy: null,
  attentive: "wave",
};

/** After "Give Buddy a heart", Home plays this clip once, only if it shows this mood. */
export const CELEBRATION_CLIP: { mood: DogMood; clip: BuddyClipKind } = { mood: "joyful", clip: "joyful" };
