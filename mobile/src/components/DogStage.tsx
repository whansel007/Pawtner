import { type CSSProperties, type ReactNode } from "react";
import type { DogMood } from "../../../shared/contract";
import { DOG_BASE_IMAGE, DOG_IMAGE_BY_MOOD, MOOD_LOOKS } from "../config/scene";
import { useImageWithFallback } from "../lib/useImageAvailable";
import { HEART_BURST_COUNT, type PetReactionKind } from "../config/pet";
import { Icon } from "./Icon";
import "./DogStage.css";

/**
 * Presentational: receives the current reaction as a prop and renders it.
 * Layers, back to front: glow → ground shadows (cast, contact, paw) → dog (+ accessory overlay)
 * → reaction overlay (hearts, dizzy stars). The speech bubble lives outside the dog (PetBubble), so it never covers the head.
 */
export function DogStage({
  mood,
  dogName,
  dizzy,
  onPet,
  reaction,
  accessory,
}: {
  mood: DogMood;
  dogName: string;
  dizzy?: boolean;
  onPet?: () => void;
  reaction?: PetReactionKind | null;
  accessory?: ReactNode;
}) {
  // A missing mood image falls back to the base art; the dog hides only if the base art is missing too.
  const image = useImageWithFallback(DOG_IMAGE_BY_MOOD[mood], DOG_BASE_IMAGE);
  const look = MOOD_LOOKS[mood];

  if (!image.available) return <div className="dog-stage" />;

  const reactionClass = reaction ? ` is-${reaction}` : "";
  const dizzyClass = dizzy ? " is-dizzy" : "";

  return (
    <div className={`dog-stage dog-stage--${mood}`} style={{ "--dog-glow": look.glow } as CSSProperties}>
      <div className="dog-stage__figure">
        <span className="dog-stage__glow" aria-hidden="true" />
        <span className="dog-stage__ground" aria-hidden="true">
          <span className="dog-stage__cast-shadow" />
          <span className="dog-stage__contact-shadow" />
          <span className="dog-stage__paw-shadow dog-stage__paw-shadow--back" />
          <span className="dog-stage__paw-shadow dog-stage__paw-shadow--front" />
        </span>
        {reaction === "hearts" && (
          <span className="dog-stage__hearts" aria-hidden="true">
            {Array.from({ length: HEART_BURST_COUNT }, (_, index) => (
              <span className={`dog-stage__heart dog-stage__heart--${index + 1}`} key={index}><Icon name="heart" size={30} /></span>
            ))}
          </span>
        )}
        {dizzy && (
          // Each star rides two nested movers (x and y, a quarter-cycle apart), which traces an ellipse around the head.
          <span className="dog-stage__stars" aria-hidden="true">
            {[1, 2, 3].map((star) => (
              <span className={`dog-stage__orbit dog-stage__orbit--${star}`} key={star}>
                <span className="dog-stage__orbit-y">
                  <span className="dog-stage__star"><Icon name="star" size={26} /></span>
                </span>
              </span>
            ))}
          </span>
        )}
        <button
          type="button"
          className={`dog-stage__pet${reactionClass}${dizzyClass}`}
          onClick={dizzy ? undefined : onPet}
          aria-label={dogName}
        >
          <span className="dog-stage__body">
            <img className="dog-stage__image" src={image.src} alt="" onError={image.onError} draggable={false} />
            {accessory}
          </span>
        </button>
      </div>
    </div>
  );
}
