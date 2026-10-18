import { useEffect, useRef, useState } from "react";
import { elapsedSeconds, WALK_TIMER_TICK_MS } from "./walkTimer";

/**
 * Seconds since `startedAt` on the app's clock (`clockNow`: the running demo clock, or real time), re-read every
 * WALK_TIMER_TICK_MS while a walk runs. One interval, cleared when the walk ends (`startedAt` null) and on unmount.
 */
export function useWalkTimer(startedAt: string | null, clockNow: () => string): number {
  const [seconds, setSeconds] = useState(0);
  // Latest clock without restarting the interval on every render.
  const clock = useRef(clockNow);
  clock.current = clockNow;
  useEffect(() => {
    if (!startedAt) { setSeconds(0); return; }
    const tick = () => setSeconds(elapsedSeconds(startedAt, clock.current()));
    tick();
    const timer = window.setInterval(tick, WALK_TIMER_TICK_MS);
    return () => window.clearInterval(timer);
  }, [startedAt]);
  return seconds;
}
