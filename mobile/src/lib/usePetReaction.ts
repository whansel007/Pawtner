import { useCallback, useEffect, useRef, useState } from "react";
import { PET_REACTIONS, PET_REACTIONS_REDUCED_MOTION, type PetReactionKind } from "../config/pet";
import type { DogMood } from "../../../shared/contract";

export interface PetReactionState {
  /** The current reaction being played, or null when idle. */
  active: PetReactionKind | null;
  /** Tap handler. Does nothing playful when mood is attentive or a reaction is playing. */
  onTap: () => void;
  /** Index into the rotation for the next idle tap. */
  bubbleLineIndex: number;
}

/**
 * Owns the pet-reaction rotation index, cooldown (ignore taps while a reaction
 * is playing), and the bark audio side effect.
 *
 * Rules:
 * - mood "attentive" → tapping does nothing playful (no reaction at all).
 * - prefers-reduced-motion → rotate only through bubble and bark.
 * - bark → skipped if the audio file fails to load or sound is off; never throw.
 */
export function usePetReaction(mood: DogMood, dogName: string): PetReactionState {
  const [active, setActive] = useState<PetReactionKind | null>(null);
  const [bubbleLineIndex, setBubbleLineIndex] = useState(0);
  const indexRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioFailedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check reduced-motion preference.
  const reducedMotion = typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const rotation: readonly PetReactionKind[] = reducedMotion
    ? PET_REACTIONS_REDUCED_MOTION
    : PET_REACTIONS.order;

  // Lazily create the Audio element for bark (never throws).
  useEffect(() => {
    if (audioRef.current || audioFailedRef.current) return;
    if (typeof Audio === "undefined") {
      audioFailedRef.current = true;
      return;
    }
    try {
      const audio = new Audio(PET_REACTIONS.barkSoundPath);
      audio.preload = "auto";
      audio.addEventListener("error", () => {
        audioFailedRef.current = true;
      });
      audioRef.current = audio;
    } catch {
      audioFailedRef.current = true;
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const onTap = useCallback(() => {
    // Attentive mood: no playful reactions at all.
    if (mood === "attentive") return;
    // Cooldown: ignore taps while a reaction is playing.
    if (active !== null) return;

    const kind = rotation[indexRef.current % rotation.length];
    indexRef.current += 1;

    // Bark: skip if audio failed or sound is off.
    if (kind === "bark") {
      if (audioFailedRef.current || !PET_REACTIONS.soundOn) {
        // Skip to next reaction instead.
        const next = rotation[indexRef.current % rotation.length];
        if (next === "bark") return; // avoid infinite skip in reduced-motion
        setActive(next);
      } else {
        const audio = audioRef.current;
        if (audio) {
          audio.currentTime = 0;
          audio.play().catch(() => {
            audioFailedRef.current = true;
          });
        }
        setActive("bark");
      }
    } else if (kind === "bubble") {
      setBubbleLineIndex((prev) => prev + 1);
      setActive("bubble");
    } else {
      setActive(kind);
    }

    const duration = PET_REACTIONS.duration[kind];
    timerRef.current = setTimeout(() => setActive(null), duration);
  }, [mood, active, rotation]);

  return { active, onTap, bubbleLineIndex };
}
