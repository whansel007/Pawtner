import { describe, expect, it } from "vitest";
import en from "../../mobile/src/locales/en.json" with { type: "json" };
import { readWalkGoal, walkGoalByKey, WALK_GOALS, writeWalkGoal } from "../../mobile/src/lib/walkGoals.js";
import { simulationFor, walkStateAt, scaleTrack } from "../../mobile/src/lib/walkState.js";
import { DEMO_POINTS, PLAYBACK_RATE, TICK_MS } from "../../mobile/src/config/walk.js";
import { walkEarnsHeart } from "../../shared/selectors.js";
import type { KeyValueStore } from "../../mobile/src/lib/localStore.js";

function memoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }, removeItem: (key) => { data.delete(key); } };
}
const KEY = "test.walkGoal";
const at = (minutes: number) => new Date(Date.parse("2026-10-18T01:00:00.000Z") + minutes * 60_000).toISOString();
const START = at(0);

describe("walk goals (en.json walkGoals, one reader)", () => {
  it("are the owner's three pairs, read from the locale file", () => {
    expect(WALK_GOALS).toEqual(en.walkGoals.options);
    expect(WALK_GOALS.map((goal) => [goal.key, goal.steps, goal.minutes])).toEqual([["3k", 3000, 30], ["5k", 5000, 50], ["10k", 10000, 100]]);
  });

  it("default to 5k; an unknown key falls back to the default", () => {
    expect(walkGoalByKey(null).key).toBe("5k");
    expect(walkGoalByKey("7k").key).toBe("5k");
    expect(walkGoalByKey("10k").minutes).toBe(100);
  });

  it("the choice is saved on this phone and read back", () => {
    const store = memoryStore();
    expect(readWalkGoal(KEY, store).key).toBe("5k");
    writeWalkGoal(KEY, "3k", store);
    expect(readWalkGoal(KEY, store).key).toBe("3k");
  });
});

describe("walk heart rule (shared walkEarnsHeart)", () => {
  it("a walk earns the heart only when it lasts its own goal", () => {
    expect(walkEarnsHeart({ startedAt: START, finishedAt: at(29), goalMinutes: 30 })).toBe(false);
    expect(walkEarnsHeart({ startedAt: START, finishedAt: at(30), goalMinutes: 30 })).toBe(true);
    expect(walkEarnsHeart({ startedAt: START, finishedAt: at(99), goalMinutes: 100 })).toBe(false);
    expect(walkEarnsHeart({ startedAt: START, finishedAt: at(100), goalMinutes: 100 })).toBe(true);
  });

  it("a walk with no goal (saved before goals existed) counts at any length", () => {
    expect(walkEarnsHeart({ startedAt: START, finishedAt: at(0), goalMinutes: null })).toBe(true);
    expect(walkEarnsHeart({ startedAt: START, finishedAt: at(1) })).toBe(true);
  });
});

describe("Simulate walk lasts the goal", () => {
  it("stretches the track to the goal, keeping every speed", () => {
    const track = scaleTrack(DEMO_POINTS, 50 * 60);
    expect(track[track.length - 1].atSeconds).toBe(3000);
    const speeds = (points: typeof DEMO_POINTS) => points.slice(1).map((b, i) => (b.meters - points[i].meters) / (b.atSeconds - points[i].atSeconds));
    speeds(track).forEach((speed, i) => expect(speed).toBeCloseTo(speeds(DEMO_POINTS)[i]));
  });

  it("plays in the same real time for every goal, and the bus still makes the dog dizzy", () => {
    const realSeconds = (points: typeof DEMO_POINTS, rate: number) => points[points.length - 1].atSeconds / rate;
    for (const goal of WALK_GOALS) {
      const { points, playbackRate } = simulationFor(goal.minutes);
      expect(points[points.length - 1].atSeconds).toBe(goal.minutes * 60);
      expect(realSeconds(points, playbackRate)).toBeCloseTo(realSeconds(DEMO_POINTS, PLAYBACK_RATE));
      // Halfway through the bus stretch, step by step at the real tick size.
      const busMiddle = (points[1].atSeconds + points[2].atSeconds) / 2;
      const step = (playbackRate * TICK_MS) / 1000;
      expect(walkStateAt(points, Math.floor(busMiddle / step) * step).dizzy).toBe(true);
      expect(walkStateAt(points, points[points.length - 1].atSeconds)).toMatchObject({ finished: true, durationSeconds: goal.minutes * 60 });
    }
  });
});
