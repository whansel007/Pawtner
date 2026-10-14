/**
 * Simulated walk demo configuration.
 * A ~15-minute walk with a 60-second bus ride at ~25 km/h in the middle.
 */

export interface WalkPoint {
  /** Elapsed time in the simulated walk (seconds). */
  atSeconds: number;
  /** Cumulative raw distance from the start (meters). */
  meters: number;
}

/** Speed threshold: above this the dog gets dizzy and distance pauses. */
export const FAST_SPEED_KMH = 12;

/** Time above threshold before dizziness kicks in. */
export const FAST_MIN_SECONDS = 30;

/** Simulated seconds advanced per real second (900 s walk -> ~20 s demo). */
export const PLAYBACK_RATE = 45;

/**
 * Demo track: ~7 min walk, 1 min bus, ~7 min walk.
 * Bus segment is fast, so the dog pauses distance and gets dizzy.
 */
export const DEMO_POINTS: WalkPoint[] = [
  { atSeconds: 0, meters: 0 },
  { atSeconds: 420, meters: 583 },
  { atSeconds: 480, meters: 1000 },
  { atSeconds: 900, meters: 1583 },
];
