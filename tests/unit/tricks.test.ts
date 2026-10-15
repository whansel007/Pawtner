import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { earnedPerformances, hasHeartsToPlay, isPerformable, resolveTrickRequest, tapRotation, trickCardTap, trickPerformance } from "../../mobile/src/lib/tricks.js";
import { PET_REACTIONS, PET_REACTIONS_REDUCED_MOTION, PLAY_MIN_HEARTS } from "../../mobile/src/config/pet.js";

const BASIC = PET_REACTIONS.order;
const sit = { name: "Sit", note: "1 day streak", earned: true };
const wave = { name: "Wave", note: "7 day streak", earned: true };
const waveLocked = { name: "Wave", note: "2 days to go", earned: false };
const rollOver = { name: "Roll over", note: "2 days to go", earned: false };

describe("trick performances", () => {
  it("Sit is the basic reactions, Wave is the wave clip, other tricks have none yet", () => {
    expect(trickPerformance(sit)).toBe("basic");
    expect(trickPerformance(wave)).toBe("wave");
    expect(trickPerformance(rollOver)).toBeNull();
    expect(trickPerformance({ name: "High five", earned: true })).toBeNull();
  });

  it("only earned tricks count; null (loading) earns nothing", () => {
    expect([...earnedPerformances([sit, waveLocked, rollOver])]).toEqual(["basic"]);
    expect([...earnedPerformances([sit, wave])].sort()).toEqual(["basic", "wave"]);
    expect(earnedPerformances(null).size).toBe(0);
  });

  it("the API and the offline mock call the 7-day trick Wave (renamed from High five)", () => {
    // Read as text: mock/milestones.ts imports mobile types without .js extensions, which the root tsconfig can't resolve.
    const mock = readFileSync(new URL("../../mobile/src/mock/milestones.ts", import.meta.url), "utf8");
    const api = readFileSync(new URL("../../api/repository.ts", import.meta.url), "utf8");
    expect(mock).toContain('{ name: "Wave", note: "7 day streak", earned: true }');
    expect(api).toContain('{ name: "Wave", threshold: 7, milestoneNote: "7 day streak" }');
    expect(mock + api).not.toMatch(/High five/i);
  });

  it("only earned tricks with a performance are buttons", () => {
    expect(isPerformable(sit)).toBe(true);
    expect(isPerformable(wave)).toBe(true);
    expect(isPerformable(waveLocked)).toBe(false);
    expect(isPerformable({ ...rollOver, earned: true })).toBe(false);
  });
});

describe("tapRotation", () => {
  it("Sit only: the original hop, hearts, bubble, bark", () => {
    expect(tapRotation(BASIC, earnedPerformances([sit, waveLocked]), true)).toEqual(["hop", "hearts", "bubble", "bark"]);
  });

  it("Wave earned and playable: the wave closes each cycle", () => {
    expect(tapRotation(BASIC, earnedPerformances([sit, wave]), true)).toEqual(["hop", "hearts", "bubble", "bark", "wave"]);
  });

  it("Wave earned but can't play (sleepy, dizzy, reduced motion, too few hearts, no clip format): skipped", () => {
    expect(tapRotation(BASIC, earnedPerformances([sit, wave]), false)).toEqual(["hop", "hearts", "bubble", "bark"]);
    expect(tapRotation(PET_REACTIONS_REDUCED_MOTION, earnedPerformances([sit, wave]), false)).toEqual(["bubble", "bark"]);
  });

  it("works without bark (sound off)", () => {
    expect(tapRotation(["hop", "hearts", "bubble"], earnedPerformances([wave]), true)).toEqual(["hop", "hearts", "bubble", "wave"]);
  });
});

describe("trick cards", () => {
  it("Sit card: a basic reaction in every mood (readings never stop play)", () => {
    for (const mood of ["content", "joyful", "sleepy", "attentive"] as const) expect(trickCardTap(sit, mood)).toBe("basic");
  });

  it("Wave card: waves when content, joyful or attentive; the gentle line when sleepy", () => {
    expect(trickCardTap(wave, "content")).toBe("wave");
    expect(trickCardTap(wave, "joyful")).toBe("wave");
    expect(trickCardTap(wave, "attentive")).toBe("wave");
    expect(trickCardTap(wave, "sleepy")).toBe("sleepyLine");
  });

  it("Buddy plays from PLAY_MIN_HEARTS hearts up; below it a tap asks for a heart", () => {
    expect(PLAY_MIN_HEARTS).toBe(2);
    for (const heart of [0, 1, Number.NaN]) expect(hasHeartsToPlay(heart)).toBe(false);
    for (const heart of [2, 3, 4]) expect(hasHeartsToPlay(heart)).toBe(true);
  });

  it("locked tricks do nothing", () => {
    expect(trickCardTap(waveLocked, "content")).toBe("none");
    expect(trickCardTap(rollOver, "content")).toBe("none");
  });

  it("a wave request falls back to a basic reaction when the clip can't play", () => {
    expect(resolveTrickRequest("wave", true)).toBe("wave");
    expect(resolveTrickRequest("wave", false)).toBe("basic");
    expect(resolveTrickRequest("basic", true)).toBe("basic");
  });
});
