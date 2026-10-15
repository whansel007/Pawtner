import { useState, type CSSProperties } from "react";
import { BACKDROP_BY_PHASE, PHASE_FADE_MS, type DayPhase } from "../config/scene";
import { useImageAvailable } from "../lib/useImageAvailable";
import { NightStars } from "./NightStars";
import "./SceneBackdrop.css";

/**
 * Back layer of the scene: the garden for the current phase, filling the app column. Sun and stars are drawn into the image;
 * at night NightStars adds twinkling knitted stars on top, positioned in the same art box so they stay in the painted sky.
 * The art's lawn line is aligned with the dog's feet (--ground-y from the dog layer); see SceneBackdrop.css.
 *
 * Day and night are stacked: the day art is the base, the night art (with its stars) sits on top and fades in or out
 * over PHASE_FADE_MS when the phase changes, so the cross-fade never dips to the shell colour. Each art box carries its
 * own aspect and ground line, so both stay on the dog's feet. The inactive art is mounted only once the active one has
 * loaded, so first paint loads one garden; it then stays mounted so the next switch can fade.
 */
export function SceneBackdrop({ phase }: { phase: DayPhase }) {
  const [warm, setWarm] = useState(false);
  const onLoaded = () => setWarm(true);
  return (
    <div
      className={`scene-backdrop scene-backdrop--${phase}`}
      style={{ "--phase-fade": `${PHASE_FADE_MS}ms` } as CSSProperties}
      aria-hidden="true"
    >
      {(phase === "day" || warm) && <BackdropArt layer="day" active={phase === "day"} onLoaded={onLoaded} />}
      {(phase === "night" || warm) && <BackdropArt layer="night" active={phase === "night"} onLoaded={onLoaded} />}
      <div className="scene-backdrop__tint" />
    </div>
  );
}

/** One phase's garden in its own art box (art coordinates: image plus, at night, the stars). */
function BackdropArt({ layer, active, onLoaded }: { layer: DayPhase; active: boolean; onLoaded: () => void }) {
  const art = BACKDROP_BY_PHASE[layer];
  const image = useImageAvailable(art.src);
  if (!image.available) return null;
  const artVars = { "--art-aspect": art.aspect, "--art-ground": art.groundLine } as CSSProperties;
  const onError = () => {
    image.onError();
    onLoaded();
  };
  return (
    <div
      className={`scene-backdrop__art scene-backdrop__art--${layer}${active ? " is-active" : ""}`}
      style={artVars}
      data-phase={layer}
    >
      <img className="scene-backdrop__image" src={art.src} alt="" decoding="async" onLoad={onLoaded} onError={onError} />
      <NightStars phase={layer} />
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
