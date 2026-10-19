import { useCallback, useEffect, useRef, useState } from "react";
import type { DoctorVisits } from "../../../shared/contract";
import { api } from "./api";

/**
 * Settings > For demo only: the doctor's prior and future visit (dates, saved on the server as given, so Buddy's agent
 * uses them too). `onSaved` runs after a change is saved (App re-reads /api/today so Health's side-effect card follows).
 * The latest callbacks are kept in a ref, so they always see App's current state.
 */
export function useDoctorVisits(onError: (error: unknown) => void, onSaved: () => void) {
  const [visits, setVisits] = useState<DoctorVisits>({ priorVisit: null, nextVisit: null });
  const callbacks = useRef({ onError, onSaved });
  callbacks.current = { onError, onSaved };
  useEffect(() => {
    api.doctorVisits().then(setVisits).catch((error) => console.warn("Doctor visits: unavailable", error));
  }, []);
  const update = useCallback((next: DoctorVisits) => {
    setVisits(next);
    api.setDoctorVisits(next)
      .then((saved) => { setVisits(saved); callbacks.current.onSaved(); })
      .catch((error) => callbacks.current.onError(error));
  }, []);
  return [visits, update] as const;
}
