import { useCallback, useState } from "react";
import { isCaretakerSlot } from "../data/personas";
import type { CaretakerSlot } from "../data/types";

/**
 * The demo persona for this tab (front end only, no account). Kept in sessionStorage so a reload keeps it;
 * storage can be blocked (private mode), so every access is wrapped and the page still works without it.
 */
const STORAGE_KEY = "pawtner.care.persona";

function readSlot(): CaretakerSlot | null {
  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    return isCaretakerSlot(value) ? value : null;
  } catch {
    return null;
  }
}

function writeSlot(slot: CaretakerSlot | null) {
  try {
    if (slot) window.sessionStorage.setItem(STORAGE_KEY, slot);
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked: the choice lasts until reload.
  }
}

export function useCaretakerSlot() {
  const [slot, setSlot] = useState<CaretakerSlot | null>(readSlot);
  const signIn = useCallback((next: CaretakerSlot) => { writeSlot(next); setSlot(next); }, []);
  const signOut = useCallback(() => { writeSlot(null); setSlot(null); }, []);
  return { slot, signIn, signOut };
}
