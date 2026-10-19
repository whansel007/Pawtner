import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";

/**
 * Settings > For demo only > the doctor's next visit (a date, saved on the server so Buddy's agent uses it too).
 * `onSaved` runs after a change is saved (App re-reads /api/today so Health's side-effect card follows it).
 * The latest callbacks are kept in a ref, so they always see App's current state (e.g. the demo clock).
 */
export function useNextVisit(onError: (error: unknown) => void, onSaved: () => void) {
  const [date, setDateState] = useState<string | null>(null);
  const callbacks = useRef({ onError, onSaved });
  callbacks.current = { onError, onSaved };
  useEffect(() => {
    api.nextVisit().then((state) => setDateState(state.date)).catch((error) => console.warn("Next visit: unavailable", error));
  }, []);
  const setDate = useCallback((next: string | null) => {
    setDateState(next);
    api.setNextVisit(next)
      .then((state) => { setDateState(state.date); callbacks.current.onSaved(); })
      .catch((error) => callbacks.current.onError(error));
  }, []);
  return [date, setDate] as const;
}
