import { CARD_SHEET, HOME_VIEW, HOME_VIEWS, type HomeView } from "../config/homeView.js";
import { browserStore, readItem, writeItem, type KeyValueStore } from "./localStore.js";
import type { Screen } from "../types/common.js";

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

/** True on the card screens that drag like Home (config/homeView.ts CARD_SHEET). */
export function isCardSheetScreen(screen: Screen): boolean {
  return CARD_SHEET.screens.includes(screen);
}

/** The card screens' view: what was chosen on this screen, or the default once the screen changes (never stored). */
export type CardViewState = { screen: Screen; view: HomeView } | null;
export function cardViewOn(state: CardViewState, screen: Screen): HomeView {
  return state && state.screen === screen ? state.view : CARD_SHEET.default;
}

/** The view that applies on this screen: Home's stored one, a card screen's, or null where nothing drags. */
export function sheetViewFor(screen: Screen, homeView: HomeView, cardView: HomeView): HomeView | null {
  if (screen === "home") return homeView;
  return isCardSheetScreen(screen) ? cardView : null;
}

/**
 * When the scene's ground has to be measured again (useSceneGround's `screenKey`): on every screen change, and whenever
 * the screen's view changes, because the views mount and unmount or move what Buddy stands on.
 */
export function sceneGroundKey(screen: Screen, view: HomeView | null): string {
  return view ? `${screen}:${view}` : screen;
}
