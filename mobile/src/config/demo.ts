/**
 * Demo time shortcuts for filming: jump the scene to a time of day without running the agent.
 * Used by the `?time=` URL parameter and the Settings > Demo buttons (App.tsx), parsed by lib/demoTime.ts.
 * Times are 24-hour "HH:MM" in the senior's timezone (SENIOR_TIMEZONE in config/scene.ts), on today's date there.
 */

/** URL parameter name: `/?time=21:00`, `/?time=morning`. */
export const DEMO_TIME_PARAM = "time";

/**
 * URL parameter for the agent clock (reads and writes happen at this time, like Settings "Run agent at this time"):
 * `/?clock=morning`. Set by Settings > For demo only > Reset to morning after the reload.
 */
export const DEMO_CLOCK_PARAM = "clock";

/** localStorage key holding the phone's agent clock for /care (lib/demoClock.ts). */
export const DEMO_CLOCK_STORAGE_KEY = "pawtner.demoClock";

/** The preset "Reset to morning" restarts the day at. */
export const DEMO_RESET_PRESET = "morning" satisfies keyof typeof DEMO_TIME_PRESETS;

/** Named presets, accepted by `?time=<name>` and shown as Settings > Demo buttons (labels in en.json). */
export const DEMO_TIME_PRESETS = {
  morning: "09:00",
  evening: "21:00",
} as const;

export type DemoTimePreset = keyof typeof DEMO_TIME_PRESETS;

/**
 * Settings > For demo only tick boxes (user, 16 Oct): show the phone as if Rose had these numbers; nothing is saved.
 * Labels in en.json settings.demoUnlock.<key>, grouped by DEMO_UNLOCK_GROUPS.
 * "todayHearts" sets today's hearts (one at a time; mood and play follow); "streakDays" raises the streak (tricks,
 * config/tricks.ts TRICK_STREAK_DAYS); "hearts" raises the lifetime total (wardrobe/worlds, config/rewards.ts).
 */
export const DEMO_UNLOCKS = [
  { key: "today1", kind: "todayHearts", value: 1 },
  { key: "today2", kind: "todayHearts", value: 2 },
  { key: "today3", kind: "todayHearts", value: 3 },
  { key: "today4", kind: "todayHearts", value: 4 },
  { key: "days7", kind: "streakDays", value: 7 },
  { key: "hearts20", kind: "hearts", value: 20 },
] as const;

/** Settings shows the ticks in these groups (headings in en.json settings.demoGroup.<id>). */
export const DEMO_UNLOCK_GROUPS = [
  { id: "today", kinds: ["todayHearts"] },
  { id: "total", kinds: ["streakDays", "hearts"] },
] as const;

/** Kinds where only one tick can be on at a time (picking one clears the others). */
export const DEMO_EXCLUSIVE_KINDS: readonly string[] = ["todayHearts"];

export type DemoUnlockKey = (typeof DEMO_UNLOCKS)[number]["key"];
