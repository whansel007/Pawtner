import { useCallback, useEffect, useState } from "react";
import { SHARING } from "../config/sharing";
import { readShareBloodPressure, writeShareBloodPressure } from "./sharing";

/** The blood-pressure sharing switch, kept in sync across tabs (Rose's app and /care side by side). */
export function useShareBloodPressure() {
  const [shared, setShared] = useState(() => readShareBloodPressure());
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === null || event.key === SHARING.bloodPressureKey) setShared(readShareBloodPressure()); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const set = useCallback((value: boolean) => {
    writeShareBloodPressure(value);
    setShared(value);
  }, []);
  return [shared, set] as const;
}
