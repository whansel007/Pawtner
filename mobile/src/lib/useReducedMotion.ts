import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function media(): MediaQueryList | null {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(QUERY) : null;
}

function subscribe(listener: () => void) {
  const list = media();
  list?.addEventListener("change", listener);
  return () => list?.removeEventListener("change", listener);
}

/** true while the user asks for reduced motion; follows changes to the setting. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => media()?.matches ?? false, () => false);
}
