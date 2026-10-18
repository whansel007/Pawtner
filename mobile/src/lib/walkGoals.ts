import en from "../locales/en.json" with { type: "json" };
import { browserStore, readItem, writeItem, type KeyValueStore } from "./localStore.js";

/**
 * Walk goals (owner, 18 Oct): how long a walk must last to earn the walk heart, chosen in Settings. The phone has no
 * step counter, so each step goal is paired with minutes (3k = 30 min, 5k = 50 min, 10k = 100 min).
 * The ONLY place the options live: en.json "walkGoals" (read straight from the locale file, like lib/demoNames.ts).
 * A table can replace this reader later; nothing else knows the numbers.
 */
export interface WalkGoal {
  key: string;
  steps: number;
  minutes: number;
}

export const WALK_GOALS: readonly WalkGoal[] = en.walkGoals.options;

/** The goal for `key`, or the default goal (en.json "walkGoals.default") for an unknown or missing key. */
export function walkGoalByKey(key: string | null | undefined): WalkGoal {
  return WALK_GOALS.find((goal) => goal.key === key)
    ?? WALK_GOALS.find((goal) => goal.key === en.walkGoals.default)
    ?? WALK_GOALS[0];
}

/** The goal chosen on this phone (localStorage `storageKey`), or the default. */
export function readWalkGoal(storageKey: string, store: KeyValueStore | null = browserStore()): WalkGoal {
  return walkGoalByKey(readItem(storageKey, store));
}

/** Saves the choice on this phone; false when storage is full or blocked (the choice then lasts this session). */
export function writeWalkGoal(storageKey: string, key: string, store: KeyValueStore | null = browserStore()): boolean {
  return writeItem(storageKey, walkGoalByKey(key).key, store);
}
