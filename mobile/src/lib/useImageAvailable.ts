import { useEffect, useState } from "react";

/** Tracks whether an <img> source loaded, so a layer can hide itself cleanly when its asset is missing. */
export function useImageAvailable(src: string) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return { available: !failed, onError: () => setFailed(true) };
}
