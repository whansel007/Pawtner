import { useCallback, useState } from "react";
import type { Screen } from "../types";
import { backKindFor, openedFrom, popHistory, pushHistory, type BackAction } from "./navigation";

/** Current screen plus a small history, so drilled-down screens return to the screen they came from. */
export function useNavigation(initial: Screen) {
  const [state, setState] = useState<{ screen: Screen; history: Screen[] }>({ screen: initial, history: [] });

  const navigate = useCallback((to: Screen) => {
    setState((current) => ({ screen: to, history: pushHistory(current.history, current.screen, to) }));
  }, []);

  const goBack = useCallback(() => {
    setState((current) => {
      const { to, history } = popHistory(current.history);
      return { screen: to, history };
    });
  }, []);

  const goHome = useCallback(() => navigate("home"), [navigate]);
  const kind = backKindFor(state.screen);
  const back: BackAction = { kind, onBack: kind === "home" ? goHome : goBack };

  return { screen: state.screen, from: openedFrom(state.history), navigate, goBack, goHome, back };
}
