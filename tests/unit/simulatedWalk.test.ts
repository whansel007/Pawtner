import { describe, expect, it } from "vitest";
import { walkStateAt } from "../../mobile/src/lib/walkState.js";
import { DEMO_POINTS, FAST_SPEED_KMH, FAST_MIN_SECONDS } from "../../mobile/src/config/walk.js";

// Track: walk 0-375 s (0-521 m), bus 375-525 s (521-1563 m), walk 525-900 s (1563-2084 m).
const BUS_START = DEMO_POINTS[1].atSeconds;
const BUS_END = DEMO_POINTS[2].atSeconds;
const WALK_METERS = DEMO_POINTS[1].meters;
const END = DEMO_POINTS[DEMO_POINTS.length - 1].atSeconds;

describe("walkStateAt", () => {
  it("track has a fast bus segment between two walking segments", () => {
    expect(BUS_END - BUS_START).toBeGreaterThan(FAST_MIN_SECONDS);
    const busKmh = ((DEMO_POINTS[2].meters - DEMO_POINTS[1].meters) / (BUS_END - BUS_START)) * 3.6;
    expect(busKmh).toBeGreaterThan(FAST_SPEED_KMH);
  });

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
    const s = walkStateAt(DEMO_POINTS, BUS_START - 1);
    expect(s.durationSeconds).toBe(BUS_START - 1);
    expect(s.distanceMeters).toBeCloseTo((WALK_METERS / BUS_START) * (BUS_START - 1), 0);
    expect(s.speedKmh).toBeCloseTo(5.0, 0);
    expect(s.dizzy).toBe(false);
    expect(s.fastStretchOccurred).toBe(false);
    expect(s.finished).toBe(false);
  });

  it("20 s into the bus is fast but not yet dizzy", () => {
    const s = walkStateAt(DEMO_POINTS, BUS_START + 20);
    // Distance pauses during fast segment
    expect(s.distanceMeters).toBeCloseTo(WALK_METERS, 0);
    expect(s.speedKmh).toBeCloseTo(25.0, 0);
    expect(s.dizzy).toBe(false); // 20 < FAST_MIN_SECONDS (30)
    expect(s.fastStretchOccurred).toBe(true);
    expect(s.finished).toBe(false);
  });

  it("40 s into the bus is dizzy", () => {
    const s = walkStateAt(DEMO_POINTS, BUS_START + 40);
    expect(s.distanceMeters).toBeCloseTo(WALK_METERS, 0);
    expect(s.speedKmh).toBeCloseTo(25.0, 0);
    expect(s.dizzy).toBe(true); // 40 >= FAST_MIN_SECONDS (30)
    expect(s.fastStretchOccurred).toBe(true);
    expect(s.finished).toBe(false);
  });

  it("just after the bus is walking again and no longer dizzy", () => {
    const s = walkStateAt(DEMO_POINTS, BUS_END + 1);
    expect(s.speedKmh).toBeCloseTo(5.0, 0);
    expect(s.dizzy).toBe(false);
    expect(s.distanceMeters).toBeGreaterThan(WALK_METERS);
  });

  it("at the end reports correct values", () => {
    const s = walkStateAt(DEMO_POINTS, END);
    expect(s.durationSeconds).toBe(END);
    // Only walking segments count: 521 + 521 = 1042
    expect(s.distanceMeters).toBeCloseTo(1042, 0);
    expect(s.speedKmh).toBe(0);
    expect(s.dizzy).toBe(false);
    expect(s.fastStretchOccurred).toBe(true);
    expect(s.finished).toBe(true);
  });

  it("does not grow distance during the bus", () => {
    const beforeBus = walkStateAt(DEMO_POINTS, BUS_START);
    const afterBus = walkStateAt(DEMO_POINTS, BUS_END);
    expect(afterBus.distanceMeters - beforeBus.distanceMeters).toBe(0);
  });
});
