/**
 * "Why?" shows the peekaboo card for a while, then flips back (pure, no React; lib/useTimedReveal.ts wraps it).
 * Owner, 18 Oct: "5 to 8 s" (config PEEK_MS). Her control (WCAG 2.2.1): pause() while her finger is on the card, resume() when it lifts, toggle()
 * again to close at once; opening again restarts the full time.
 */
export interface TimedRevealState {
  open: boolean;
  paused: boolean;
  /** Counts each opening (a fresh progress line per opening). */
  round: number;
}

export interface TimedRevealClock {
  now: () => number;
  setTimer: (callback: () => void, ms: number) => unknown;
  clearTimer: (handle: unknown) => void;
}

export function createTimedReveal(durationMs: number, onChange: (state: TimedRevealState) => void, clock: TimedRevealClock) {
  let state: TimedRevealState = { open: false, paused: false, round: 0 };
  let timer: unknown = null;
  let deadline = 0;
  let remaining = durationMs;
  const set = (next: TimedRevealState) => { state = next; onChange(state); };
  const stopTimer = () => { if (timer !== null) clock.clearTimer(timer); timer = null; };
  const schedule = (ms: number) => {
    stopTimer();
    deadline = clock.now() + ms;
    timer = clock.setTimer(() => { timer = null; set({ ...state, open: false, paused: false }); }, ms);
  };
  const open = () => { remaining = durationMs; schedule(durationMs); set({ open: true, paused: false, round: state.round + 1 }); };
  const close = () => { stopTimer(); set({ ...state, open: false, paused: false }); };
  return {
    get state() { return state; },
    toggle: () => (state.open ? close() : open()),
    close,
    pause: () => {
      if (!state.open || state.paused) return;
      remaining = Math.max(0, deadline - clock.now());
      stopTimer();
      set({ ...state, paused: true });
    },
    resume: () => {
      if (!state.open || !state.paused) return;
      schedule(remaining);
      set({ ...state, paused: false });
    },
    dispose: stopTimer,
  };
}
