import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { DogMood } from "../../../shared/contract";
import { BUDDY_CLIPS, CLIP_PRELOAD_FALLBACK_MS, CLIP_SAFETY_TIMEOUT_MS, type BuddyClipKind } from "../config/clips";
import { celebrationClipFor, clipMatchesMood, pickClipSource, waveClipFor } from "./buddyClips";
import { useReducedMotion } from "./useReducedMotion";
import type { Screen } from "../types";

/** What DogStage needs to draw a clip over the still. */
export interface ClipView {
  id: number;
  src: string;
  /** true once the clip is really playing; until then the still stays visible (no blank flash). */
  visible: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  onPlaying: () => void;
  /** ended, error: hand back to the still. */
  onDone: () => void;
}

export interface BuddyClip {
  /** The clip on screen, or null. */
  view: ClipView | null;
  /** The wave clip for this mood (content → wave, joyful → joyful), or null: sleepy, attentive, dizzy, reduced motion, unsupported browser. */
  waveClip: BuddyClipKind | null;
  play: (kind: BuddyClipKind) => void;
}

/** Chosen file per clip for this browser (null = this browser can't draw the clip with transparency). */
function browserSources(): Record<BuddyClipKind, string | null> {
  const none = { wave: null, joyful: null };
  if (typeof document === "undefined" || typeof navigator === "undefined") return none;
  try {
    const probe = document.createElement("video");
    const env = { vendor: navigator.vendor ?? "", canPlayType: (type: string) => probe.canPlayType(type) };
    return { wave: pickClipSource(env, BUDDY_CLIPS.wave), joyful: pickClipSource(env, BUDDY_CLIPS.joyful) };
  } catch {
    return none;
  }
}

/** Detached preload elements; kept so the browser keeps the downloaded clips. */
const preloaded: HTMLVideoElement[] = [];

function preloadClips(sources: (string | null)[]) {
  for (const src of sources) {
    if (!src || preloaded.some((video) => video.src.endsWith(src))) continue;
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "auto";
    video.src = src;
    video.load();
    preloaded.push(video);
  }
}

/**
 * Owns Buddy's video clips: which file this browser gets, idle preloading after Home first renders,
 * starting a clip (the Wave trick from a tap or trick card, or a fresh heart), the 7 s safety stop, and handing back to the still.
 *
 * Rules:
 * - Nothing plays on load; a clip starts only from play() (Wave: dog tap or the Wave card) or a new celebrateRequest.
 * - celebrateRequest: App bumps it after "Give Buddy a heart". The next time Home shows, the joyful clip plays once
 *   if the dog is joyful; otherwise the request is dropped.
 * - No clip under reduced motion, while dizzy, in a mood without a clip, or in a browser that can't draw it.
 * - A clip stops early if the mood changes away from the clip's face.
 */
export function useBuddyClip({ mood, screen, dizzy, celebrateRequest }: { mood: DogMood; screen: Screen; dizzy: boolean; celebrateRequest: number }): BuddyClip {
  const reducedMotion = useReducedMotion();
  const sources = useMemo(browserSources, []);
  const [playing, setPlaying] = useState<{ id: number; kind: BuddyClipKind; src: string } | null>(null);
  const [visibleId, setVisibleId] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const nextId = useRef(1);
  const handledCelebration = useRef(celebrateRequest);

  // Dizzy counts as "no motion clips" too: the dog wobbles and can't be tapped.
  const options = useMemo(
    () => ({ reducedMotion: reducedMotion || dizzy, canPlay: (kind: BuddyClipKind) => sources[kind] !== null }),
    [reducedMotion, dizzy, sources],
  );

  /** Ends clip `id` only: a late callback from an earlier clip never stops a newer one. */
  const stop = useCallback((id: number) => {
    setPlaying((current) => (current?.id === id ? null : current));
    setVisibleId((current) => (current === id ? null : current));
  }, []);

  const play = useCallback((kind: BuddyClipKind) => {
    const src = sources[kind];
    if (!src || options.reducedMotion) return;
    setPlaying({ id: nextId.current++, kind, src });
  }, [sources, options]);

  // Preload both clips once Home has rendered and the browser is idle; never blocks anything.
  useEffect(() => {
    if (screen !== "home" || reducedMotion) return;
    const start = () => preloadClips([sources.wave, sources.joyful]);
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(start);
      return () => window.cancelIdleCallback(handle);
    }
    const timer = window.setTimeout(start, CLIP_PRELOAD_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [screen, reducedMotion, sources]);

  // Start the mounted video; stop on rejection, on a missing video (dog not on screen) or after the safety timeout.
  useEffect(() => {
    if (!playing) return;
    const { id } = playing;
    const video = videoRef.current;
    if (!video) {
      stop(id);
      return;
    }
    video.muted = true;
    video.play().catch(() => stop(id));
    const timer = window.setTimeout(() => stop(id), CLIP_SAFETY_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [playing, stop]);

  // A fresh heart: play the celebration once Home shows the dog (or drop it if Buddy isn't joyful there).
  useEffect(() => {
    if (celebrateRequest === handledCelebration.current || screen !== "home") return;
    handledCelebration.current = celebrateRequest;
    const kind = celebrationClipFor(mood, options);
    if (kind) play(kind);
  }, [celebrateRequest, screen, mood, options, play]);

  // Stop if the clip no longer fits the dog (mood changed, dizzy, reduced motion switched on).
  useEffect(() => {
    if (playing && (options.reducedMotion || !clipMatchesMood(playing.kind, mood))) stop(playing.id);
  }, [playing, mood, options, stop]);

  const view: ClipView | null = playing
    ? {
        id: playing.id,
        src: playing.src,
        visible: visibleId === playing.id,
        videoRef,
        onPlaying: () => setVisibleId(playing.id),
        onDone: () => stop(playing.id),
      }
    : null;

  return { view, waveClip: waveClipFor(mood, options), play };
}
