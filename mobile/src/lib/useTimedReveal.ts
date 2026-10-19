import { useEffect, useRef, useState } from "react";
import { createTimedReveal, type TimedRevealState } from "./timedReveal";

/** React side of lib/timedReveal.ts: open for `durationMs`, pause on touch, toggle to close; timer cleared on unmount. */
export function useTimedReveal(durationMs: number) {
  const [state, setState] = useState<TimedRevealState>({ open: false, paused: false, round: 0 });
  const reveal = useRef<ReturnType<typeof createTimedReveal> | null>(null);
  if (!reveal.current) {
    reveal.current = createTimedReveal(durationMs, setState, {
      now: () => Date.now(),
      setTimer: (callback, ms) => window.setTimeout(callback, ms),
      clearTimer: (handle) => window.clearTimeout(handle as number),
    });
  }
  useEffect(() => () => reveal.current?.dispose(), []);
  const { toggle, pause, resume } = reveal.current;
  return { ...state, toggle, pause, resume };
}
