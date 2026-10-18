import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { readShareBloodPressure, writeShareBloodPressure } from "./sharing";

/**
 * The blood-pressure sharing switch. The server keeps it (GET / PUT /api/sharing) and enforces it in the caretaker summary,
 * so /care follows it from any browser; this phone keeps a local copy for a quick first paint and offline.
 * A failed save switches back and reports through `onApiError` (the toast).
 */
export function useShareBloodPressure(onApiError: (error: unknown) => void) {
  const [shared, setShared] = useState(() => readShareBloodPressure());
  useEffect(() => {
    api.sharing()
      .then((settings) => { writeShareBloodPressure(settings.shareBloodPressure); setShared(settings.shareBloodPressure); })
      .catch((error) => console.warn("Sharing: setting unavailable", error));
  }, []);
  const set = useCallback((value: boolean) => {
    const previous = shared;
    writeShareBloodPressure(value);
    setShared(value);
    api.updateSharing({ shareBloodPressure: value }).catch((error) => {
      writeShareBloodPressure(previous);
      setShared(previous);
      onApiError(error);
    });
  }, [shared, onApiError]);
  return [shared, set] as const;
}
