import type { CSSProperties } from "react";
import type { DayPhase } from "../config/scene";
import { NIGHT_STARS, type NightStar } from "../config/stars";
import { useImageAvailable } from "../lib/useImageAvailable";
import "./NightStars.css";

/**
 * Decorative twinkling stars, night only. Place it inside a box the size of the backdrop art:
 * positions are % of that box (config/stars.ts), so the stars stay in the painted sky at any crop.
 */
export function NightStars({ phase, stars = NIGHT_STARS }: { phase: DayPhase; stars?: readonly NightStar[] }) {
  if (phase !== "night") return null;
  return (
    <div className="night-stars" aria-hidden="true">
      {stars.map((star, index) => (
        <NightStarImage key={index} star={star} />
      ))}
    </div>
  );
}

/** One star; hides itself if its image fails to load. */
function NightStarImage({ star }: { star: NightStar }) {
  const image = useImageAvailable(star.src);
  if (!image.available) return null;
  const vars = {
    "--star-x": `${star.x}%`,
    "--star-y": `${star.y}%`,
    "--star-size": `${star.size}%`,
    "--star-rotate": `${star.rotate}deg`,
    "--star-duration": `${star.duration}s`,
    "--star-offset": `${star.offset}s`,
  } as CSSProperties;
  return (
    <span className="night-stars__star" style={vars}>
      <img src={star.src} alt="" draggable={false} onError={image.onError} />
    </span>
  );
}
