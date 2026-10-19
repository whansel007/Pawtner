import { useCallback, useEffect, useRef, useState } from "react";
import type { NextVisitState } from "../../../shared/contract";
import { api } from "./api";

/**
 * Settings > For demo only > the doctor's next visit (a date, saved on the server so Buddy's agent uses it too) and the
 * last visit (read-only; the server sets it when a new date replaces one that has passed). `now` = the app's clock,
 * which decides whether the old date has passed. `onSaved` runs after a change is saved (App re-reads /api/today so
 * Health's side-effect card follows it). The latest callbacks are kept in a ref, so they always see App's state.
 */
export function useNextVisit(now: () => string, onError: (error: unknown) => void, onSaved: () => void) {
  const [state, setState] = useState<NextVisitState>({ date: null, lastVisit: null });
  const callbacks = useRef({ now, onError, onSaved });
  callbacks.current = { now, onError, onSaved };
  useEffect(() => {
    api.nextVisit().then(setState).catch((error) => console.warn("Next visit: unavailable", error));
  }, []);
  const setDate = useCallback((next: string | null) => {
    setState((current) => ({ ...current, date: next }));
    api.setNextVisit(next, callbacks.current.now())
      .then((saved) => { setState(saved); callbacks.current.onSaved(); })
      .catch((error) => callbacks.current.onError(error));
  }, []);
  return [state, setDate] as const;
}
