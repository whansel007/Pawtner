import { describe, expect, it } from "vitest";
import { clipMatchesMood, clipOverlayBox, pickClipSource, waveClipFor } from "../../mobile/src/lib/buddyClips.js";
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

  it("tap: content and attentive wave, joyful replays the joyful clip, sleepy never plays a clip", () => {
    expect(waveClipFor("content", ok)).toBe("wave");
    expect(waveClipFor("attentive", ok)).toBe("wave");
    expect(waveClipFor("joyful", ok)).toBe("joyful");
    expect(waveClipFor("sleepy", ok)).toBeNull();
  });

  it("reduced motion or an unplayable clip → no clip", () => {
    expect(waveClipFor("content", { reducedMotion: true, canPlay: () => true })).toBeNull();
    expect(waveClipFor("content", { reducedMotion: false, canPlay: () => false })).toBeNull();
    expect(waveClipFor("joyful", { reducedMotion: false, canPlay: (kind) => kind === "wave" })).toBeNull();
  });

  it("a clip keeps playing only while the mood has its face", () => {
    expect(clipMatchesMood("wave", "content")).toBe(true);
    expect(clipMatchesMood("wave", "joyful")).toBe(false);
    expect(clipMatchesMood("joyful", "joyful")).toBe(true);
    expect(clipMatchesMood("joyful", "sleepy")).toBe(false);
  });
});
