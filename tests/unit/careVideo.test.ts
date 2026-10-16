import { describe, expect, it } from "vitest";
import { youtubeEmbedUrl } from "../../mobile/src/care/lib/video.js";
import { guardRoute, isSignedInRoute, routeFromPath } from "../../mobile/src/care/routing.js";
import { DEMO_VIDEO_URL } from "../../mobile/src/care/config.js";

describe("/care/video", () => {
  it("turns common YouTube links into the privacy-enhanced embed", () => {
    const embed = "https://www.youtube-nocookie.com/embed/xlip3x6tUjk?rel=0";
    expect(youtubeEmbedUrl("https://youtu.be/xlip3x6tUjk")).toBe(embed);
    expect(youtubeEmbedUrl("https://youtu.be/xlip3x6tUjk?si=abc")).toBe(embed);
    expect(youtubeEmbedUrl("https://www.youtube.com/watch?v=xlip3x6tUjk&t=5")).toBe(embed);
    expect(youtubeEmbedUrl("https://m.youtube.com/watch?v=xlip3x6tUjk")).toBe(embed);
    expect(youtubeEmbedUrl("https://www.youtube.com/embed/xlip3x6tUjk")).toBe(embed);
    expect(youtubeEmbedUrl("#")).toBeNull();
    expect(youtubeEmbedUrl("https://vimeo.com/123")).toBeNull();
  });

  it("is a public route, and the configured video embeds", () => {
    expect(routeFromPath("/care/video")).toBe("video");
    expect(routeFromPath("/care/video/")).toBe("video");
    expect(isSignedInRoute("video")).toBe(false);
    expect(guardRoute("video", false)).toBe("video");
    expect(youtubeEmbedUrl(DEMO_VIDEO_URL)).not.toBeNull();
  });
});
