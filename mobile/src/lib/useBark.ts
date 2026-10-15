import { useCallback, useEffect, useSyncExternalStore } from "react";
import { PET_REACTIONS } from "../config/pet";

/**
 * The bark sound, shared by the dog-tap rotation (usePetReaction) and the round paw button (App).
 * One Audio element for the whole app, created on first use (never autoplays; it plays only from a tap).
 * - sound off (PET_REACTIONS.soundOn) or no Audio support → unavailable.
 * - the file fails to load ("error" event) → unavailable from then on; callers drop the bark.
 * - play() rejections (e.g. the browser blocks audio) are ignored and don't disable later barks.
 */
let audio: HTMLAudioElement | null = null;
let failed = !PET_REACTIONS.soundOn;
const listeners = new Set<() => void>();

function markFailed() {
  if (failed) return;
  failed = true;
  listeners.forEach((listener) => listener());
}

function ensureAudio(): HTMLAudioElement | null {
  if (failed) return null;
  if (audio) return audio;
  if (typeof Audio === "undefined") {
    markFailed();
    return null;
  }
  try {
    const element = new Audio(PET_REACTIONS.barkSoundPath);
    element.preload = "auto";
    element.addEventListener("error", markFailed);
    audio = element;
    // A cached failure can already be set.
    if (element.error) markFailed();
    return failed ? null : element;
  } catch {
    markFailed();
    return null;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export interface Bark {
  /** false when sound is off or the file can't load; the tap rotation leaves the bark out. */
  available: boolean;
  /** Plays the bark from the start. Never throws. */
  bark: () => void;
}

export function useBark(): Bark {
  const available = !useSyncExternalStore(subscribe, () => failed, () => failed);

  // Load the (12 KB) file once a bark user mounts, so the first bark isn't late.
  useEffect(() => {
    ensureAudio();
  }, []);

  const bark = useCallback(() => {
    const element = ensureAudio();
    if (!element) return;
    try {
      element.currentTime = 0;
      void element.play().catch(() => undefined);
    } catch {
      // Ignore: a bark is decoration.
    }
  }, []);

  return { available, bark };
}
