import { FAST_SPEED_KMH, FAST_MIN_SECONDS } from "../config/walk.js";
import type { WalkPoint } from "../config/walk.js";

export interface WalkState {
  durationSeconds: number;
  distanceMeters: number;
  speedKmh: number;
  dizzy: boolean;
  fastStretchOccurred: boolean;
  finished: boolean;
}

/** What a finished simulated walk reports back to the app. */
export type WalkCompletion = Pick<WalkState, "distanceMeters" | "fastStretchOccurred">;

/**
 * Pure function: given a track and elapsed simulated time, return the current walk state.
 * Distance grows only at or below FAST_SPEED_KMH.
 * dizzy is true once speed stays above FAST_SPEED_KMH for FAST_MIN_SECONDS continuously.
 */
export function walkStateAt(points: WalkPoint[], elapsedSeconds: number): WalkState {
  const last = points[points.length - 1];
  const durationSeconds = Math.min(elapsedSeconds, last.atSeconds);
  const finished = elapsedSeconds >= last.atSeconds;

  let distanceMeters = 0;
  let fastStretchOccurred = false;
  let continuousFastSeconds = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const segDuration = b.atSeconds - a.atSeconds;
    const segDistance = b.meters - a.meters;
    const segSpeedKmh = segDuration > 0 ? (segDistance / segDuration) * 3.6 : 0;

    if (b.atSeconds <= elapsedSeconds) {
      // Whole segment has elapsed
      if (segSpeedKmh <= FAST_SPEED_KMH) {
        distanceMeters += segDistance;
        continuousFastSeconds = 0;
      } else {
        fastStretchOccurred = true;
        continuousFastSeconds += segDuration;
      }
    } else if (a.atSeconds < elapsedSeconds) {
      // Partially elapsed
      const partial = elapsedSeconds - a.atSeconds;
      const partialDistance = segDuration > 0 ? (segDistance / segDuration) * partial : 0;
      if (segSpeedKmh <= FAST_SPEED_KMH) {
        distanceMeters += partialDistance;
        continuousFastSeconds = 0;
      } else {
        fastStretchOccurred = true;
        continuousFastSeconds += partial;
      }
    }
  }

  // Current speed from the active segment
  let speedKmh = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (elapsedSeconds >= a.atSeconds && elapsedSeconds < b.atSeconds) {
      const segDuration = b.atSeconds - a.atSeconds;
      const segDistance = b.meters - a.meters;
      speedKmh = segDuration > 0 ? (segDistance / segDuration) * 3.6 : 0;
      break;
    }
  }

  const dizzy = continuousFastSeconds >= FAST_MIN_SECONDS;

  return { durationSeconds, distanceMeters, speedKmh, dizzy, fastStretchOccurred, finished };
}
