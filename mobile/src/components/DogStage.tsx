import { useState, type CSSProperties, type ReactNode } from "react";
import type { DogMood } from "../../../shared/contract";
import { DOG_IMAGE_BY_MOOD, MOOD_LOOKS } from "../config/scene";
import { useImageAvailable } from "../lib/useImageAvailable";
import "./DogStage.css";

/**
 * Fills its parent slot (not the screen) and stands the dog at the bottom centre of it,
 * sized by container units so it always fits the free space.
 * Layers, back to front: glow → cast shadow (soft ellipse, away from the light) → contact shadow → dog (+ accessory overlay).
 * Video loops would need dog-only clips in this layered design; the old full-scene loop is not supported.
 */
export function DogStage({
  mood,
  dogName,
  onPet,
  accessory,
}: {
  mood: DogMood;
  dogName: string;
  onPet?: () => void;
  /** Optional overlay that moves with the dog (hat, glasses, ...). */
  accessory?: ReactNode;
}) {
  const src = DOG_IMAGE_BY_MOOD[mood];
  const image = useImageAvailable(src);
  const [wiggling, setWiggling] = useState(false);
  const look = MOOD_LOOKS[mood];

  if (!image.available) return <div className="dog-stage" />;

  const pet = () => {
    if (look.playful) setWiggling(true);
    onPet?.();
  };

  return (
    <div className={`dog-stage dog-stage--${mood}`} style={{ "--dog-glow": look.glow } as CSSProperties}>
      <div className="dog-stage__figure">
        <span className="dog-stage__glow" aria-hidden="true" />
        <span className="dog-stage__cast-shadow" aria-hidden="true" />
        <span className="dog-stage__contact-shadow" aria-hidden="true" />
        <button
          type="button"
          className={`dog-stage__pet ${wiggling ? "is-wiggling" : ""}`}
          onClick={pet}
          onAnimationEnd={() => setWiggling(false)}
          aria-label={dogName}
        >
          <span className="dog-stage__body">
            <img className="dog-stage__image" src={src} alt="" onError={image.onError} draggable={false} />
            {accessory}
          </span>
        </button>
      </div>
    </div>
  );
}
