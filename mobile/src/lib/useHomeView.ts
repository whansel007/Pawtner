import { useCallback, useEffect, useState } from "react";
import { HOME_VIEW, type HomeView } from "../config/homeView";
import { readHomeView, writeHomeView } from "./homeView";

/** What Home shows (dragging the card), kept on this phone and in sync across tabs. */
export function useHomeView() {
  const [view, setView] = useState<HomeView>(() => readHomeView());
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === null || event.key === HOME_VIEW.storageKey) setView(readHomeView()); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const set = useCallback((next: HomeView) => {
    writeHomeView(next);
    setView(next);
  }, []);
  return [view, set] as const;
}
