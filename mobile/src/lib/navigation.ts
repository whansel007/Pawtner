import type { Screen } from "../types/common.js";

/**
 * Screen navigation rules (pure, no React), shared by useNavigation and the unit tests.
 * Top-level screens are reached from the nav, the top bar or Home; their back button says "Home" and goes Home.
 * Every other senior screen is drilled down into; its back button says "Back" and returns to where it was opened from.
 */
export const TOP_LEVEL_SCREENS: readonly Screen[] = ["cover", "dedication", "home", "health", "milestones", "walk", "settings"];

export type BackKind = "home" | "back";

/** What a screen's back button does: its label kind and the action App wires to it. */
export interface BackAction {
  kind: BackKind;
  onBack: () => void;
}

/** Keeps the trail short; drilled-down chains are only a few screens deep. */
export const MAX_HISTORY = 10;

export function isTopLevel(screen: Screen): boolean {
  return TOP_LEVEL_SCREENS.includes(screen);
}

export function backKindFor(screen: Screen): BackKind {
  return isTopLevel(screen) ? "home" : "back";
}

/** The trail after moving from `from` to `to`: a top-level screen starts a fresh trail, a drilled-down one remembers `from`. */
export function pushHistory(history: readonly Screen[], from: Screen, to: Screen): Screen[] {
  if (isTopLevel(to)) return [];
  if (from === to) return [...history];
  return [...history, from].slice(-MAX_HISTORY);
}

/** Where "Back" goes, and the trail left behind. An empty trail falls back to Home. */
export function popHistory(history: readonly Screen[]): { to: Screen; history: Screen[] } {
  if (history.length === 0) return { to: "home", history: [] };
  return { to: history[history.length - 1], history: history.slice(0, -1) };
}
