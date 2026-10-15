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
  const [forceFinished, setForceFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const state = useMemo(
    () => walkStateAt(DEMO_POINTS, elapsedSimulatedSeconds),
    [elapsedSimulatedSeconds]
  );

  const start = useCallback(() => {
    setStarted(true);
    setForceFinished(false);
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

  /**
   * End the simulation early, keeping the distance and duration accumulated so far.
   * The interval is cleared and the walk reports completion exactly once via the
   * `forceFinished` flag (consumers OR it with `state.finished`).
   */
  const finish = useCallback(() => {
    setForceFinished(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Clear interval when the walk finishes (natural or forced)
  useEffect(() => {
    if (started && (state.finished || forceFinished) && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [started, state.finished, forceFinished]);

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { state, start, finish, started, forceFinished };
}
