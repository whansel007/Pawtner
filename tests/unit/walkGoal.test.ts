import { describe, expect, it } from "vitest";
import en from "../../mobile/src/locales/en.json" with { type: "json" };
import { readWalkGoal, walkGoalByKey, WALK_GOALS, writeWalkGoal } from "../../mobile/src/lib/walkGoals.js";
import { simulationFor, walkStateAt, scaleTrack } from "../../mobile/src/lib/walkState.js";
import { DEMO_POINTS, PLAYBACK_RATE, TICK_MS } from "../../mobile/src/config/walk.js";
import { walkHeartTimes } from "../../shared/selectors.js";
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

describe("walk heart rule (shared walkHeartTimes): a day's walks add up", () => {
  const walk = (from: number, to: number, goalMinutes: number | null = 50) => ({ startedAt: at(from), finishedAt: at(to), goalMinutes });

  it("one walk: earns at its finish only when it lasts the goal", () => {
    expect(walkHeartTimes([walk(0, 29, 30)])).toEqual([]);
    expect(walkHeartTimes([walk(0, 30, 30)])).toEqual([at(30)]);
    expect(walkHeartTimes([walk(0, 99, 100)])).toEqual([]);
    expect(walkHeartTimes([walk(0, 100, 100)])).toEqual([at(100)]);
  });

  it("stop and continue: 20 + 30 min with goal 50 earns at the second walk's finish", () => {
    expect(walkHeartTimes([walk(0, 20), walk(60, 90)])).toEqual([at(90)]);
  });

  it("20 + 20 min with goal 50 earns nothing; a third walk that reaches 50 earns at its finish", () => {
    expect(walkHeartTimes([walk(0, 20), walk(60, 80)])).toEqual([]);
    expect(walkHeartTimes([walk(0, 20), walk(60, 80), walk(120, 130)])).toEqual([at(130)]);
  });

  it("walks on different days never add up; at most one heart per day", () => {
    const nextDay = 24 * 60;
    expect(walkHeartTimes([walk(0, 30), walk(nextDay, nextDay + 30)])).toEqual([]);
    expect(walkHeartTimes([walk(0, 50), walk(60, 120), walk(nextDay, nextDay + 50)])).toEqual([at(50), at(nextDay + 50)]);
  });

  it("a walk with no goal (saved before goals) earns at any length, as before", () => {
    expect(walkHeartTimes([walk(0, 1, null)])).toEqual([at(1)]);
    expect(walkHeartTimes([{ startedAt: START, finishedAt: at(0) }])).toEqual([at(0)]);
  });

  it("a goal change mid-day uses the finishing walk's goal", () => {
    // 20 min under 50, then 15 min under 30: 35 >= 30 → heart at the second walk.
    expect(walkHeartTimes([walk(0, 20, 50), walk(60, 75, 30)])).toEqual([at(75)]);
    // 20 min under 30, then 15 min under 100: 35 < 100 → none.
    expect(walkHeartTimes([walk(0, 20, 30), walk(60, 75, 100)])).toEqual([]);
  });

  it("order of the list doesn't matter", () => {
    expect(walkHeartTimes([walk(60, 90), walk(0, 20)])).toEqual([at(90)]);
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
