/**
 * The demo video's embed address (pure). Takes a YouTube link in any common shape (youtu.be/ID, youtube.com/watch?v=ID,
 * /embed/ID, /shorts/ID) and gives the privacy-enhanced player URL, so /care/video plays it on our own page and the
 * address bar stays on Pawtner. Anything else (or "#") gives null.
 */
export function youtubeEmbedUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\./, "").replace(/^m\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = parsed.pathname.slice(1).split("/")[0] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = parsed.searchParams.get("v") ?? parsed.pathname.match(/^\/(?:embed|shorts)\/([^/?#]+)/)?.[1] ?? null;
  }
  return id && /^[A-Za-z0-9_-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null;
}
