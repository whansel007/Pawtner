import { useCallback, useState } from "react";
import type { HomeView } from "../config/homeView";
import type { Screen } from "../types";
import { cardViewOn, type CardViewState } from "./homeView";

/** The card screens' view (config/homeView.ts CARD_SHEET): starts at the default on every visit, never stored. */
export function useCardView(screen: Screen) {
  const [state, setState] = useState<CardViewState>(null);
  // A new screen starts over (reset during render, so the old view never shows for a frame).
  const [visited, setVisited] = useState(screen);
  if (visited !== screen) {
    setVisited(screen);
    setState(null);
  }
  const set = useCallback((view: HomeView) => setState({ screen, view }), [screen]);
  return [cardViewOn(visited === screen ? state : null, screen), set] as const;
}
