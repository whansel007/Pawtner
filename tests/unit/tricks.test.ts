import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { earnedPerformances, isPerformable, resolveTrickRequest, tapRotation, trickCardTap, trickPerformance } from "../../mobile/src/lib/tricks.js";
import { PET_REACTIONS, PET_REACTIONS_REDUCED_MOTION } from "../../mobile/src/config/pet.js";

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

  it("Wave earned but can't play (sleepy, attentive, dizzy, reduced motion, no clip format): skipped", () => {
    expect(tapRotation(BASIC, earnedPerformances([sit, wave]), false)).toEqual(["hop", "hearts", "bubble", "bark"]);
    expect(tapRotation(PET_REACTIONS_REDUCED_MOTION, earnedPerformances([sit, wave]), false)).toEqual(["bubble", "bark"]);
  });

  it("works without bark (sound off)", () => {
    expect(tapRotation(["hop", "hearts", "bubble"], earnedPerformances([wave]), true)).toEqual(["hop", "hearts", "bubble", "wave"]);
  });
});

describe("trick cards", () => {
  it("Sit card: a basic reaction in any mood but attentive", () => {
    for (const mood of ["content", "joyful", "sleepy"] as const) expect(trickCardTap(sit, mood)).toBe("basic");
    expect(trickCardTap(sit, "attentive")).toBe("none");
  });

  it("Wave card: waves when content or joyful, the gentle line when sleepy, nothing when attentive", () => {
    expect(trickCardTap(wave, "content")).toBe("wave");
    expect(trickCardTap(wave, "joyful")).toBe("wave");
    expect(trickCardTap(wave, "sleepy")).toBe("sleepyLine");
    expect(trickCardTap(wave, "attentive")).toBe("none");
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
