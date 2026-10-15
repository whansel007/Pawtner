import type { DogMood } from "../../../shared/contract.js";
import { CELEBRATION_CLIP, CLIP_CANVAS, CLIP_MEDIA_TYPES, WAVE_CLIP_BY_MOOD, type BuddyClipKind, type ClipSources } from "../config/clips.js";

/**
 * Buddy clip rules (pure, no React, no DOM), shared by useBuddyClip and the unit tests.
 */

/** What pickClipSource needs from the browser: navigator.vendor and a video element's canPlayType. */
export interface ClipEnv {
  vendor: string;
  canPlayType: (type: string) => string;
}

/**
 * Picks the clip file this browser can draw with transparency, or null (no clip; the still stays).
 * Safari/WebKit can't draw VP9 alpha and Chrome can't draw HEVC alpha (it shows a black box), so:
 * Apple WebKit with HEVC → .mov; otherwise VP9 → .webm; neither → null.
 */
export function pickClipSource(env: ClipEnv, sources: ClipSources): string | null {
  const isAppleWebKit = env.vendor.includes("Apple");
  if (isAppleWebKit) return env.canPlayType(CLIP_MEDIA_TYPES.hevcAlpha) !== "" ? sources.mov : null;
  if (env.canPlayType(CLIP_MEDIA_TYPES.vp9Alpha) !== "") return sources.webm;
  return null;
}

/** The clip overlay box, in % of the still art's canvas box (which can be a little outside it). */
export interface ClipOverlayBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function clipOverlayBox(canvas: typeof CLIP_CANVAS = CLIP_CANVAS): ClipOverlayBox {
  const { padX, padTop, base } = canvas;
  return {
    left: (-padX / base.w) * 100,
    top: (-padTop / base.h) * 100,
    width: ((base.w + 2 * padX) / base.w) * 100,
    height: ((base.h + padTop) / base.h) * 100,
  };
}

/** What a trigger needs to know: reduced motion, and whether this browser can draw a given clip. */
export interface ClipTriggerOptions {
  reducedMotion: boolean;
  canPlay: (kind: BuddyClipKind) => boolean;
}

function allowedClip(kind: BuddyClipKind | null, opts: ClipTriggerOptions): BuddyClipKind | null {
  if (!kind || opts.reducedMotion || !opts.canPlay(kind)) return null;
  return kind;
}

/** The clip the Wave trick plays in this mood, or null (no wave: sleepy, attentive, reduced motion, no playable format). */
export function waveClipFor(mood: DogMood, opts: ClipTriggerOptions): BuddyClipKind | null {
  return allowedClip(WAVE_CLIP_BY_MOOD[mood], opts);
}

/** The clip a fresh heart plays once Home shows the dog, or null when Home isn't showing the joyful mood. */
export function celebrationClipFor(mood: DogMood, opts: ClipTriggerOptions): BuddyClipKind | null {
  return allowedClip(mood === CELEBRATION_CLIP.mood ? CELEBRATION_CLIP.clip : null, opts);
}

/** A playing clip stops early when the dog's mood no longer has that clip's face. */
export function clipMatchesMood(kind: BuddyClipKind, mood: DogMood): boolean {
  return WAVE_CLIP_BY_MOOD[mood] === kind;
}
