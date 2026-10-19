import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTimedReveal, type TimedRevealState } from "../../mobile/src/lib/timedReveal.js";
import { PEEK_MS } from "../../mobile/src/config/decisions.js";

describe("'Why?' peekaboo timing (6 s, pause on touch, close on a second tap)", () => {
  let states: TimedRevealState[];
  let reveal: ReturnType<typeof createTimedReveal>;
  beforeEach(() => {
    vi.useFakeTimers();
    states = [];
    reveal = createTimedReveal(PEEK_MS, (state) => states.push(state), {
      now: () => Date.now(),
      setTimer: (callback, ms) => setTimeout(callback, ms),
      clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
    });
  });
  afterEach(() => vi.useRealTimers());

  it("is 6 seconds (owner: 5 to 8)", () => expect(PEEK_MS).toBe(6000));

  it("opens, then flips back by itself after 6 s", () => {
    reveal.toggle();
    expect(reveal.state).toMatchObject({ open: true, paused: false, round: 1 });
    vi.advanceTimersByTime(5999);
    expect(reveal.state.open).toBe(true);
    vi.advanceTimersByTime(1);
    expect(reveal.state.open).toBe(false);
  });

  it("a second tap closes at once; tapping again opens for a fresh 6 s", () => {
    reveal.toggle();
    vi.advanceTimersByTime(3000);
    reveal.toggle();
    expect(reveal.state.open).toBe(false);
    reveal.toggle();
    expect(reveal.state.round).toBe(2);
    vi.advanceTimersByTime(5999);
    expect(reveal.state.open).toBe(true);
    vi.advanceTimersByTime(1);
    expect(reveal.state.open).toBe(false);
  });

  it("her finger on the card pauses the time; lifting it continues with what was left", () => {
    reveal.toggle();
    vi.advanceTimersByTime(2000);
    reveal.pause();
    expect(reveal.state).toMatchObject({ open: true, paused: true });
    vi.advanceTimersByTime(60_000);
    expect(reveal.state.open).toBe(true);
    reveal.resume();
    vi.advanceTimersByTime(3999);
    expect(reveal.state.open).toBe(true);
    vi.advanceTimersByTime(1);
    expect(reveal.state.open).toBe(false);
  });

  it("pause and resume do nothing while closed; dispose clears the timer", () => {
    reveal.pause();
    reveal.resume();
    expect(states).toEqual([]);
    reveal.toggle();
    reveal.dispose();
    vi.advanceTimersByTime(10_000);
    expect(reveal.state.open).toBe(true);
  });
});
