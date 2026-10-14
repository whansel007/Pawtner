import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEMO_POINTS, PLAYBACK_RATE, TICK_MS } from "../config/walk.js";
import { walkStateAt } from "./walkState.js";

/**
 * React hook that drives a simulated walk with one interval.
 * Each TICK_MS tick advances PLAYBACK_RATE * TICK_MS / 1000 simulated seconds.
 * Cleared automatically on finish and on unmount.
 */
export function useSimulatedWalk() {
  const [elapsedSimulatedSeconds, setElapsedSimulatedSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const state = useMemo(
    () => walkStateAt(DEMO_POINTS, elapsedSimulatedSeconds),
    [elapsedSimulatedSeconds]
  );

  const start = useCallback(() => {
    setStarted(true);
    setElapsedSimulatedSeconds(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      setElapsedSimulatedSeconds((prev) => {
        const end = DEMO_POINTS[DEMO_POINTS.length - 1].atSeconds;
        const next = prev + (PLAYBACK_RATE * TICK_MS) / 1000;
        return next >= end ? end : next;
      });
    }, TICK_MS);
  }, []);

  // Clear interval when the walk finishes
  useEffect(() => {
    if (started && state.finished && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [started, state.finished]);

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { state, start, started };
}
