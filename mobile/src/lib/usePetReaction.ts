import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PET_REACTIONS, PET_REACTIONS_REDUCED_MOTION, type PetReactionKind } from "../config/pet";
import type { BuddyClipKind } from "../config/clips";
import type { TrickPerformance } from "../config/tricks";
import { resolveTrickRequest, tapRotation } from "./tricks";
import { useBark } from "./useBark";
import { useReducedMotion } from "./useReducedMotion";

export interface PetReactionState {
  /** The current reaction being played, or null when idle. */
  active: PetReactionKind | null;
  /** Dog tap: the next step of the rotation; with too few hearts, the "needs a heart" bubble. Ignored while something plays. */
  onTap: () => void;
  /** A trick card asked Buddy to perform (Milestones). Same cooldown and hearts rule as a tap. */
  perform: (performance: TrickPerformance) => void;
  /** Index of the next bubble line to show (0-based; first bubble shows line 0). */
  bubbleLineIndex: number;
  /** true while the bubble asks for a heart (too few hearts to play). */
  prompt: boolean;
}

/** The Wave clip side of a tap, from useBuddyClip. */
export interface WaveClip {
  /** The clip the Wave trick plays now, or null (can't wave: sleepy, attentive, dizzy, reduced motion, unsupported). */
  kind: BuddyClipKind | null;
  /** true while a clip is on screen: taps wait, like the reaction cooldown. */
  busy: boolean;
  play: (kind: BuddyClipKind) => void;
}

/**
 * Owns the pet-reaction rotation and cooldown (ignore taps while a reaction or clip is playing).
 * The bark sound comes from useBark (shared with the paw button).
 *
 * Rules:
 * - Too few hearts (`canPlay` false, lib/tricks.ts hasHeartsToPlay) → a tap or trick shows the "needs a heart" bubble
 *   (`prompt`) instead of playing. Mood never blocks play (attentive from readings plays as normal; user, 16 Oct).
 * - Sit (always earned first) gives the basic reactions: hop, hearts, bubble; under prefers-reduced-motion only the
 *   bubble. No bark: the woof belongs to the paw button (user, 16 Oct).
 * - Wave, once earned (`earned` from Milestones' tricks), joins the dog-tap rotation after the basic reactions:
 *   hop → hearts → bubble → wave. It is skipped whenever the wave clip can't play (lib/tricks.ts tapRotation).
 * - perform("basic") (Sit card) plays the next basic reaction from its own counter, so Sit always shows a basic one;
 *   perform("wave") (Wave card) plays the clip, or the next basic reaction if the clip can't play right now.
 * - The bubble line advances on every bubble; the first bubble shows line 1.
 */
export function usePetReaction(earned: ReadonlySet<TrickPerformance>, canPlay: boolean, clip?: WaveClip): PetReactionState {
  const [active, setActive] = useState<PetReactionKind | null>(null);
  const [prompt, setPrompt] = useState(false);
  const [bubbleLineIndex, setBubbleLineIndex] = useState(0);
  const tapIndexRef = useRef(0);
  const basicIndexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useReducedMotion();
  const { available: barkAvailable, bark } = useBark();

  // Unmount-only cleanup: clear the reaction timer so it does not fire after unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Basic (Sit) reactions: drop "bark" when sound is off or the file failed to load.
  const basic = useMemo(() => {
    const base = reducedMotion ? PET_REACTIONS_REDUCED_MOTION : PET_REACTIONS.order;
    return barkAvailable ? [...base] : base.filter((r) => r !== "bark");
  }, [reducedMotion, barkAvailable]);

  const waveKind = clip?.kind ?? null;
  const rotation = useMemo(() => tapRotation(basic, earned, waveKind !== null), [basic, earned, waveKind]);

  /** Something is already playing. */
  const blocked = active !== null || Boolean(clip?.busy);

  /** Too few hearts: the bubble asks for a heart (same duration as a bubble reaction). */
  const askForHeart = useCallback(() => {
    setPrompt(true);
    setActive("bubble");
    timerRef.current = setTimeout(() => {
      setActive(null);
      setPrompt(false);
    }, PET_REACTIONS.duration.bubble);
  }, []);

  const playBasic = useCallback((kind: PetReactionKind) => {
    if (kind === "bark") bark();
    // bubbleLineIndex is the line to show on THIS bubble (0-based); it advances when the bubble ends.
    setActive(kind);
    timerRef.current = setTimeout(() => {
      setActive(null);
      if (kind === "bubble") setBubbleLineIndex((prev) => prev + 1);
    }, PET_REACTIONS.duration[kind]);
  }, [bark]);

  const nextBasic = useCallback(() => {
    if (basic.length === 0) return;
    playBasic(basic[basicIndexRef.current % basic.length]);
    basicIndexRef.current += 1;
  }, [basic, playBasic]);

  const onTap = useCallback(() => {
    if (blocked) return;
    if (!canPlay) { askForHeart(); return; }
    if (rotation.length === 0) return;
    const step = rotation[tapIndexRef.current % rotation.length];
    tapIndexRef.current += 1;
    // The clip is the visual; its own end (or safety stop) is the cooldown.
    if (step === "wave") {
      if (waveKind) clip?.play(waveKind);
      return;
    }
    playBasic(step);
  }, [blocked, canPlay, askForHeart, rotation, waveKind, clip, playBasic]);

  const perform = useCallback((performance: TrickPerformance) => {
    if (blocked) return;
    if (!canPlay) { askForHeart(); return; }
    if (resolveTrickRequest(performance, waveKind !== null) === "wave" && waveKind) {
      clip?.play(waveKind);
      return;
    }
    nextBasic();
  }, [blocked, canPlay, askForHeart, waveKind, clip, nextBasic]);

  return { active, onTap, perform, bubbleLineIndex, prompt };
}
