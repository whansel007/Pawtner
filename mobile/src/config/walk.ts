/**
 * Simulated walk demo configuration.
 * A ~15-minute walk with a 150-second bus ride at ~25 km/h in the middle.
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

/** Real milliseconds between playback ticks (each tick advances PLAYBACK_RATE / 5 = 9 s). */
export const TICK_MS = 200;

/** Demo stride length used to derive step count from walked distance (meters per step). */
export const STRIDE_METERS = 0.7;

/** Demo calories burned per kilometer walked (used to derive kcal from distance). */
export const KCAL_PER_KM = 50;

/**
 * Demo track: 375 s walk (~5 km/h), 150 s bus (~25 km/h), 375 s walk (~5 km/h).
 * Bus segment is fast, so the dog pauses distance and gets dizzy
 * from 30 s into the bus until it ends (~2.8 real seconds at 200 ms ticks).
 */
export const DEMO_POINTS: WalkPoint[] = [
  { atSeconds: 0, meters: 0 },
  { atSeconds: 375, meters: 521 },
  { atSeconds: 525, meters: 1563 },
  { atSeconds: 900, meters: 2084 },
];
