import { BACKDROP_BY_PHASE, type DayPhase } from "../config/scene";
import { useImageAvailable } from "../lib/useImageAvailable";
import "./SceneBackdrop.css";

/** Back layer of the scene: the garden for the current phase, filling the app column. Sun and stars are drawn into the image. */
export function SceneBackdrop({ phase }: { phase: DayPhase }) {
  const src = BACKDROP_BY_PHASE[phase];
  const image = useImageAvailable(src);
  return (
    <div className={`scene-backdrop scene-backdrop--${phase}`} aria-hidden="true">
      {image.available && <img className="scene-backdrop__image" src={src} alt="" onError={image.onError} />}
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
      style={{ backgroundImage: `url("${BACKDROP_BY_PHASE[phase]}")` }}
    />
  );
}
