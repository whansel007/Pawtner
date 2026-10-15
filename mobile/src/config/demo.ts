/**
 * Demo time shortcuts for filming: jump the scene to a time of day without running the agent.
 * Used by the `?time=` URL parameter and the Settings > Demo buttons (App.tsx), parsed by lib/demoTime.ts.
 * Times are 24-hour "HH:MM" in the senior's timezone (SENIOR_TIMEZONE in config/scene.ts), on today's date there.
 */

/** URL parameter name: `/?time=21:00`, `/?time=morning`. */
export const DEMO_TIME_PARAM = "time";

/** Named presets, accepted by `?time=<name>` and shown as Settings > Demo buttons (labels in en.json). */
export const DEMO_TIME_PRESETS = {
  morning: "09:00",
  evening: "21:00",
} as const;

export type DemoTimePreset = keyof typeof DEMO_TIME_PRESETS;
