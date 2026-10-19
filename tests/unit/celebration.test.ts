import { describe, expect, it } from "vitest";
import { celebrationFor } from "../../mobile/src/lib/celebration.js";
import { earnedPerformances } from "../../mobile/src/lib/tricks.js";
import { withStreak } from "../../mobile/src/lib/demoUnlocks.js";
import { TRICK_STREAK_DAYS } from "../../mobile/src/config/tricks.js";

const tricks = [
  { name: "Sit", note: "1 day streak", earned: true },
  { name: "Wave", note: "", earned: false },
];
/** Wave earned from the streak, the same way DogLayer works it out (Milestones' tricks + the shown streak). */
const waveEarnedAt = (streak: number) => earnedPerformances(withStreak(tricks, streak)).has("wave");
const motion = { waveCanPlay: true, noMotion: false };

describe("Buddy's celebration (one rule)", () => {
  it("Wave is earned at a 7-day streak", () => {
    expect(TRICK_STREAK_DAYS.Wave).toBe(7);
    expect(waveEarnedAt(6)).toBe(false);
    expect(waveEarnedAt(7)).toBe(true);
  });

  it("a heart earned: streak 6 → hearts, streak 7 → wave", () => {
    expect(celebrationFor("heartEarned", { ...motion, waveEarned: waveEarnedAt(6) })).toEqual({ animation: "hearts", bubbleKey: null });
    expect(celebrationFor("heartEarned", { ...motion, waveEarned: waveEarnedAt(7) })).toEqual({ animation: "wave", bubbleKey: null });
  });

  it("Wave earned but the clip can't play now (sleepy, unsupported browser) → hearts", () => {
    expect(celebrationFor("heartEarned", { waveEarned: true, waveCanPlay: false, noMotion: false }).animation).toBe("hearts");
  });

  it("a walk short of the goal: only 'Just a little bit more!', no hearts and never the wave", () => {
    expect(celebrationFor("walkNotYet", { ...motion, waveEarned: true })).toEqual({ animation: null, bubbleKey: "pet.walkMore" });
    expect(celebrationFor("walkNotYet", { ...motion, waveEarned: false })).toEqual({ animation: null, bubbleKey: "pet.walkMore" });
  });

  it("reduced motion (or dizzy) → no animation; the short-walk bubble still shows", () => {
    expect(celebrationFor("heartEarned", { waveEarned: true, waveCanPlay: true, noMotion: true })).toEqual({ animation: null, bubbleKey: null });
    expect(celebrationFor("walkNotYet", { waveEarned: false, waveCanPlay: false, noMotion: true })).toEqual({ animation: null, bubbleKey: "pet.walkMore" });
  });
});
