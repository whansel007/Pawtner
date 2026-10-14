import { useEffect, useState } from "react";

/** Tracks whether an <img> source loaded, so a layer can hide itself cleanly when its asset is missing. */
export function useImageAvailable(src: string) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return { available: !failed, onError: () => setFailed(true) };
}

/**
 * Tries src first and switches to fallback if it fails to load.
 * available is false only when the fallback fails too.
 */
export function useImageWithFallback(src: string, fallback: string) {
  const primary = useImageAvailable(src);
  const backup = useImageAvailable(fallback);
  if (primary.available && src !== fallback) return { src, available: true, onError: primary.onError };
  return { src: fallback, available: backup.available, onError: backup.onError };
}
