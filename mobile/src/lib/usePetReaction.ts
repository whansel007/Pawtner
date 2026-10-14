import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PET_REACTIONS, PET_REACTIONS_REDUCED_MOTION, type PetReactionKind } from "../config/pet";
import type { DogMood } from "../../../shared/contract";

export interface PetReactionState {
  /** The current reaction being played, or null when idle. */
  active: PetReactionKind | null;
  /** Tap handler. Does nothing playful when mood is attentive or a reaction is playing. */
  onTap: () => void;
  /** Index of the next bubble line to show (0-based; first bubble shows line 0). */
  bubbleLineIndex: number;
}

/**
 * Owns the pet-reaction rotation index, cooldown (ignore taps while a reaction
 * is playing), and the bark audio side effect.
 *
 * Rules:
 * - mood "attentive" → tapping does nothing playful (no reaction at all).
 * - prefers-reduced-motion → rotate only through bubble and bark.
 * - bark is dropped from the rotation up front when sound is off or the file
 *   failed to load; never throws.
 * - Each tap plays exactly the next reaction with its own duration.
 * - The bubble line advances on every bubble; the first bubble shows line 1.
 *
 * Effects are split: the audio setup effect never clears the reaction timer.
 * The reaction timer is cleared only in a separate unmount effect, so when
 * audio fails mid-bark the reaction still ends after its own duration.
 */
export function usePetReaction(mood: DogMood, dogName: string): PetReactionState {
  const [active, setActive] = useState<PetReactionKind | null>(null);
  const [bubbleLineIndex, setBubbleLineIndex] = useState(0);
  const [audioFailed, setAudioFailed] = useState(!PET_REACTIONS.soundOn);
  const indexRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check reduced-motion preference.
  const reducedMotion = typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Audio setup effect: creates the Audio element for bark. Never throws.
  // Does NOT clear the reaction timer — that is handled by a separate effect.
  useEffect(() => {
    if (audioRef.current || audioFailed || !PET_REACTIONS.soundOn) return;
    if (typeof Audio === "undefined") {
      setAudioFailed(true);
      return;
    }
    try {
      const audio = new Audio(PET_REACTIONS.barkSoundPath);
      audio.preload = "auto";
      const onError = () => setAudioFailed(true);
      audio.addEventListener("error", onError);
      // If the browser has already set an error (e.g. from a previous cached failure), mark it now.
      if (audio.error) onError();
      audioRef.current = audio;
    } catch {
      setAudioFailed(true);
    }
  }, [audioFailed]);

  // Unmount-only cleanup: clear the reaction timer so it does not fire after unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Build the available rotation up front: drop "bark" when sound is off or
  // the file failed to load.
  const rotation = useMemo(() => {
    const base = reducedMotion
      ? PET_REACTIONS_REDUCED_MOTION
      : PET_REACTIONS.order;
    return PET_REACTIONS.soundOn && !audioFailed
      ? base
      : base.filter((r) => r !== "bark");
  }, [reducedMotion, audioFailed]);

  const onTap = useCallback(() => {
    // Attentive mood: no playful reactions at all.
    if (mood === "attentive") return;
    // Cooldown: ignore taps while a reaction is playing.
    if (active !== null) return;
    if (rotation.length === 0) return;

    const kind = rotation[indexRef.current % rotation.length];
    indexRef.current += 1;

    if (kind === "bubble") {
      // bubbleLineIndex is the line to show on THIS bubble (0-based).
      // It advances for the next bubble when this reaction ends.
      setActive("bubble");
    } else {
      if (kind === "bark") {
        const audio = audioRef.current;
        if (audio) {
          audio.currentTime = 0;
          audio.play().catch(() => {
            setAudioFailed(true);
          });
        }
      }
      setActive(kind);
    }

    const duration = PET_REACTIONS.duration[kind];
    timerRef.current = setTimeout(() => {
      setActive(null);
      if (kind === "bubble") setBubbleLineIndex((prev) => prev + 1);
    }, duration);
  }, [mood, active, rotation]);

  return { active, onTap, bubbleLineIndex };
}
