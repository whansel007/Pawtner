import { describe, expect, it } from "vitest";
import { walkStateAt } from "../../mobile/src/lib/simulatedWalk.js";
import { DEMO_POINTS, FAST_SPEED_KMH, FAST_MIN_SECONDS } from "../../mobile/src/config/walk.js";

describe("walkStateAt", () => {
  it("at 0 s returns zero state", () => {
    const s = walkStateAt(DEMO_POINTS, 0);
    expect(s.durationSeconds).toBe(0);
    expect(s.distanceMeters).toBe(0);
    expect(s.speedKmh).toBeCloseTo(5.0, 0);
    expect(s.dizzy).toBe(false);
    expect(s.fastStretchOccurred).toBe(false);
    expect(s.finished).toBe(false);
  });

  it("just before the bus has walked distance and no dizziness", () => {
    const s = walkStateAt(DEMO_POINTS, 419);
    expect(s.durationSeconds).toBe(419);
    expect(s.distanceMeters).toBeCloseTo((583 / 420) * 419, 0);
    expect(s.speedKmh).toBeCloseTo(5.0, 0);
    expect(s.dizzy).toBe(false);
    expect(s.fastStretchOccurred).toBe(false);
    expect(s.finished).toBe(false);
  });

  it("20 s into the bus is fast but not yet dizzy", () => {
    const s = walkStateAt(DEMO_POINTS, 440);
    expect(s.durationSeconds).toBe(440);
    // Distance pauses during fast segment
    expect(s.distanceMeters).toBeCloseTo(583, 0);
    expect(s.speedKmh).toBeCloseTo(25.0, 0);
    expect(s.dizzy).toBe(false); // 20 < FAST_MIN_SECONDS (30)
    expect(s.fastStretchOccurred).toBe(true);
    expect(s.finished).toBe(false);
  });

  it("40 s into the bus is dizzy", () => {
    const s = walkStateAt(DEMO_POINTS, 460);
    expect(s.durationSeconds).toBe(460);
    // Distance pauses during fast segment
    expect(s.distanceMeters).toBeCloseTo(583, 0);
    expect(s.speedKmh).toBeCloseTo(25.0, 0);
    expect(s.dizzy).toBe(true); // 40 >= FAST_MIN_SECONDS (30)
    expect(s.fastStretchOccurred).toBe(true);
    expect(s.finished).toBe(false);
  });

  it("at the end reports correct values", () => {
    const s = walkStateAt(DEMO_POINTS, 900);
    expect(s.durationSeconds).toBe(900);
    // Only walking segments count: 583 + 583 = 1166
    expect(s.distanceMeters).toBeCloseTo(1166, 0);
    expect(s.speedKmh).toBe(0);
    expect(s.dizzy).toBe(false);
    expect(s.fastStretchOccurred).toBe(true);
    expect(s.finished).toBe(true);
  });

  it("pauses distance accumulation above threshold", () => {
    const beforeBus = walkStateAt(DEMO_POINTS, 420);
    const afterBus = walkStateAt(DEMO_POINTS, 480);
    const busDistance = afterBus.distanceMeters - beforeBus.distanceMeters;
    // Bus speed is ~25 km/h, which is > FAST_SPEED_KMH (12)
    // So distance should not increase during the bus segment
    expect(busDistance).toBe(0);
  });
});
