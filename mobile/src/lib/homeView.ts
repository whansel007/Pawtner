import { HOME_VIEW, HOME_VIEWS, type HomeView } from "../config/homeView.js";
import { browserStore, readItem, writeItem, type KeyValueStore } from "./localStore.js";

/** Settings > What Home shows (pure helpers). Anything unknown in storage reads as the default. */
export function readHomeView(store: KeyValueStore | null = browserStore()): HomeView {
  const raw = readItem(HOME_VIEW.storageKey, store);
  return (HOME_VIEWS as readonly string[]).includes(raw ?? "") ? (raw as HomeView) : HOME_VIEW.default;
}

/** True when stored; false means the choice lasts only this session. */
export function writeHomeView(view: HomeView, store: KeyValueStore | null = browserStore()): boolean {
  return writeItem(HOME_VIEW.storageKey, view, store);
}
