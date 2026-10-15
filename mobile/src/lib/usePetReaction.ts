import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PET_REACTIONS, PET_REACTIONS_REDUCED_MOTION, type PetReactionKind } from "../config/pet";
import type { BuddyClipKind } from "../config/clips";
import type { DogMood } from "../../../shared/contract";
import { useBark } from "./useBark";
import { useReducedMotion } from "./useReducedMotion";

export interface PetReactionState {
  /** The current reaction being played, or null when idle. */
  active: PetReactionKind | null;
  /** Tap handler. Does nothing playful when mood is attentive or a reaction is playing. */
  onTap: () => void;
  /** Index of the next bubble line to show (0-based; first bubble shows line 0). */
  bubbleLineIndex: number;
}

/** The clip side of a tap, from useBuddyClip. */
export interface TapClip {
  /** The clip a tap plays now, or null (the tap uses the normal rotation only). */
  kind: BuddyClipKind | null;
  /** true while a clip is on screen: taps wait, like the reaction cooldown. */
  busy: boolean;
  play: (kind: BuddyClipKind) => void;
}

/** Reactions a clip replaces: both move or cover the dog, which would fight the clip. */
const CLIP_REPLACES: readonly PetReactionKind[] = ["hop", "hearts"];

/**
 * Owns the pet-reaction rotation index and cooldown (ignore taps while a reaction or clip is playing).
 * The bark sound comes from useBark (shared with the paw button).
 *
 * Rules:
 * - mood "attentive" → tapping does nothing playful (no reaction at all).
 * - prefers-reduced-motion → rotate only through bubble and bark.
 * - bark is dropped from the rotation when sound is off or the file failed to load; never throws.
 * - Each tap plays exactly the next reaction with its own duration.
 * - When a clip can play (content → wave, joyful → joyful), every tap plays it; the rotation still advances:
 *   hop and hearts are replaced by the clip, the bubble line and the bark sound still come with it.
 * - The bubble line advances on every bubble; the first bubble shows line 1.
 */
export function usePetReaction(mood: DogMood, clip?: TapClip): PetReactionState {
  const [active, setActive] = useState<PetReactionKind | null>(null);
  const [bubbleLineIndex, setBubbleLineIndex] = useState(0);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useReducedMotion();
  const { available: barkAvailable, bark } = useBark();

  // Unmount-only cleanup: clear the reaction timer so it does not fire after unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Build the available rotation up front: drop "bark" when sound is off or the file failed to load.
  const rotation = useMemo(() => {
    const base = reducedMotion ? PET_REACTIONS_REDUCED_MOTION : PET_REACTIONS.order;
    return barkAvailable ? base : base.filter((r) => r !== "bark");
  }, [reducedMotion, barkAvailable]);

  const onTap = useCallback(() => {
    // Attentive mood: no playful reactions at all.
    if (mood === "attentive") return;
    // Cooldown: ignore taps while a reaction or a clip is playing.
    if (active !== null || clip?.busy) return;
    if (rotation.length === 0) return;

    const kind = rotation[indexRef.current % rotation.length];
    indexRef.current += 1;

    if (clip?.kind) {
      clip.play(clip.kind);
      // The clip is the visual; its own end (or safety stop) is the cooldown.
      if (CLIP_REPLACES.includes(kind)) return;
    }

    if (kind === "bark") bark();
    // bubbleLineIndex is the line to show on THIS bubble (0-based); it advances when the bubble ends.
    setActive(kind);

    timerRef.current = setTimeout(() => {
      setActive(null);
      if (kind === "bubble") setBubbleLineIndex((prev) => prev + 1);
    }, PET_REACTIONS.duration[kind]);
  }, [mood, active, rotation, clip, bark]);

  return { active, onTap, bubbleLineIndex };
}
