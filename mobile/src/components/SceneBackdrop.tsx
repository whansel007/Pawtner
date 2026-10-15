import type { CSSProperties } from "react";
import { BACKDROP_BY_PHASE, type DayPhase } from "../config/scene";
import { useImageAvailable } from "../lib/useImageAvailable";
import { NightStars } from "./NightStars";
import "./SceneBackdrop.css";

/**
 * Back layer of the scene: the garden for the current phase, filling the app column. Sun and stars are drawn into the image;
 * at night NightStars adds twinkling knitted stars on top, positioned in the same art box so they stay in the painted sky.
 * The art's lawn line is aligned with the dog's feet (--ground-y from the dog layer); see SceneBackdrop.css.
 */
export function SceneBackdrop({ phase }: { phase: DayPhase }) {
  const art = BACKDROP_BY_PHASE[phase];
  const image = useImageAvailable(art.src);
  const artVars = { "--art-aspect": art.aspect, "--art-ground": art.groundLine } as CSSProperties;
  return (
    <div className={`scene-backdrop scene-backdrop--${phase}`} style={artVars} aria-hidden="true">
      {image.available && (
        <div className="scene-backdrop__art">
          <img className="scene-backdrop__image" src={art.src} alt="" onError={image.onError} />
          <NightStars phase={phase} />
        </div>
      )}
      <div className="scene-backdrop__tint" />
    </div>
  );
}

/** Desktop only: the same garden blurred and darkened behind the column, so wide screens never stretch the app. */
export function DesktopBackdrop({ phase }: { phase: DayPhase }) {
  return (
    <div
      className="desktop-backdrop"
      aria-hidden="true"
      style={{ backgroundImage: `url("${BACKDROP_BY_PHASE[phase].src}")` }}
    />
  );
}
