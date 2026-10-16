import { HOME_VIEW, HOME_VIEWS, type HomeView } from "../config/homeView.js";
import { browserStore, readItem, writeItem, type KeyValueStore } from "./localStore.js";

/** What Home shows (pure helpers; chosen by dragging the card, config/homeView.ts). Anything unknown in storage reads as the default. */
export function readHomeView(store: KeyValueStore | null = browserStore()): HomeView {
  const raw = readItem(HOME_VIEW.storageKey, store);
  return (HOME_VIEWS as readonly string[]).includes(raw ?? "") ? (raw as HomeView) : HOME_VIEW.default;
}

/** True when stored; false means the choice lasts only this session. */
export function writeHomeView(view: HomeView, store: KeyValueStore | null = browserStore()): boolean {
  return writeItem(HOME_VIEW.storageKey, view, store);
}

/**
 * The view a drag lands on. `towardForm` is the drag distance toward the form side in px (portrait: up, landscape: left;
 * negative = toward Buddy). Each `snapPx` moves one step along HOME_VIEWS, never past either end.
 */
export function homeViewAfterDrag(view: HomeView, towardForm: number, snapPx: number = HOME_VIEW.snapPx): HomeView {
  const steps = Math.trunc(towardForm / snapPx);
  return stepHomeView(view, steps);
}

/** One or more steps along HOME_VIEWS (positive = toward the form), clamped at the ends. Arrow keys use one step. */
export function stepHomeView(view: HomeView, steps: number): HomeView {
  const index = Math.min(HOME_VIEWS.length - 1, Math.max(0, HOME_VIEWS.indexOf(view) + steps));
  return HOME_VIEWS[index]!;
}
