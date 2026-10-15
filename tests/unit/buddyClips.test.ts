import { describe, expect, it } from "vitest";
import { celebrationClipFor, clipMatchesMood, clipOverlayBox, pickClipSource, tapClipFor } from "../../mobile/src/lib/buddyClips.js";
import { BUDDY_CLIPS, CLIP_CANVAS, CLIP_MEDIA_TYPES } from "../../mobile/src/config/clips.js";

const SOURCES = BUDDY_CLIPS.wave;

/** A browser that answers canPlayType "probably" for the listed media types and "" otherwise. */
function env(vendor: string, playable: string[]) {
  return { vendor, canPlayType: (type: string) => (playable.includes(type) ? "probably" : "") };
}

describe("pickClipSource", () => {
  it("Safari (Apple vendor) with HEVC gets the .mov", () => {
    expect(pickClipSource(env("Apple Computer, Inc.", [CLIP_MEDIA_TYPES.hevcAlpha]), SOURCES)).toBe(SOURCES.mov);
  });

  it("Safari never gets the .webm, even if it claims VP9 (it can't draw VP9 alpha)", () => {
    expect(pickClipSource(env("Apple Computer, Inc.", [CLIP_MEDIA_TYPES.vp9Alpha]), SOURCES)).toBeNull();
    expect(pickClipSource(env("Apple Computer, Inc.", [CLIP_MEDIA_TYPES.hevcAlpha, CLIP_MEDIA_TYPES.vp9Alpha]), SOURCES)).toBe(SOURCES.mov);
  });

  it("Chrome and Firefox get the .webm, even if they claim HEVC (no HEVC alpha there)", () => {
    expect(pickClipSource(env("Google Inc.", [CLIP_MEDIA_TYPES.vp9Alpha]), SOURCES)).toBe(SOURCES.webm);
    expect(pickClipSource(env("Google Inc.", [CLIP_MEDIA_TYPES.vp9Alpha, CLIP_MEDIA_TYPES.hevcAlpha]), SOURCES)).toBe(SOURCES.webm);
    expect(pickClipSource(env("", [CLIP_MEDIA_TYPES.vp9Alpha]), SOURCES)).toBe(SOURCES.webm);
  });

  it("no playable format → null (the still stays)", () => {
    expect(pickClipSource(env("Google Inc.", [CLIP_MEDIA_TYPES.hevcAlpha]), SOURCES)).toBeNull();
    expect(pickClipSource(env("Google Inc.", []), SOURCES)).toBeNull();
    expect(pickClipSource(env("Apple Computer, Inc.", []), SOURCES)).toBeNull();
  });

  it("treats 'maybe' as playable", () => {
    expect(pickClipSource({ vendor: "Google Inc.", canPlayType: () => "maybe" }, SOURCES)).toBe(SOURCES.webm);
  });
});

describe("clipOverlayBox", () => {
  it("pads the 1000x1300 art canvas by 100 left/right and 30 on top", () => {
    const box = clipOverlayBox(CLIP_CANVAS);
    expect(box.left).toBeCloseTo(-10);
    expect(box.width).toBeCloseTo(120);
    expect(box.top).toBeCloseTo((-30 / 1300) * 100);
    expect(box.height).toBeCloseTo((1330 / 1300) * 100);
    // Bottom edge of the clip = bottom of the art; aspect = the clip's 1200x1330 frame.
    expect(box.top + box.height).toBeCloseTo(100);
    expect((box.width * 1000) / (box.height * 1300)).toBeCloseTo(1200 / 1330);
  });
});

describe("clip triggers", () => {
  const ok = { reducedMotion: false, canPlay: () => true };

  it("tap: content waves, joyful replays the joyful clip, sleepy and attentive never play a clip", () => {
    expect(tapClipFor("content", ok)).toBe("wave");
    expect(tapClipFor("joyful", ok)).toBe("joyful");
    expect(tapClipFor("sleepy", ok)).toBeNull();
    expect(tapClipFor("attentive", ok)).toBeNull();
  });

  it("fresh heart: only a joyful Home plays the joyful clip", () => {
    expect(celebrationClipFor("joyful", ok)).toBe("joyful");
    for (const mood of ["content", "sleepy", "attentive"] as const) expect(celebrationClipFor(mood, ok)).toBeNull();
  });

  it("reduced motion or an unplayable clip → no clip", () => {
    expect(tapClipFor("content", { reducedMotion: true, canPlay: () => true })).toBeNull();
    expect(celebrationClipFor("joyful", { reducedMotion: true, canPlay: () => true })).toBeNull();
    expect(tapClipFor("content", { reducedMotion: false, canPlay: () => false })).toBeNull();
    expect(tapClipFor("joyful", { reducedMotion: false, canPlay: (kind) => kind === "wave" })).toBeNull();
  });

  it("a clip keeps playing only while the mood has its face", () => {
    expect(clipMatchesMood("wave", "content")).toBe(true);
    expect(clipMatchesMood("wave", "joyful")).toBe(false);
    expect(clipMatchesMood("joyful", "joyful")).toBe(true);
    expect(clipMatchesMood("joyful", "sleepy")).toBe(false);
  });
});
