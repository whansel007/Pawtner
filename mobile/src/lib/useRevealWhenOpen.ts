import { useEffect, type RefObject } from "react";
import { useReducedMotion } from "./useReducedMotion";

/**
 * When `open` turns true, scrolls the element just enough to be fully visible inside its scroll area
 * (block "nearest"); CSS scroll-margin keeps it clear of the bottom nav. No smooth scroll under reduced motion.
 */
export function useRevealWhenOpen(ref: RefObject<HTMLElement | null>, open: boolean) {
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    ref.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "nearest" });
  }, [open, ref, reducedMotion]);
}
