import { type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { DogMood } from "../../../shared/contract";
import { DOG_IMAGE_BY_MOOD, MOOD_LOOKS } from "../config/scene";
import { useImageAvailable } from "../lib/useImageAvailable";
import { BUBBLE_LINE_KEYS, type PetReactionKind } from "../config/pet";
import { Icon } from "./Icon";
import "./DogStage.css";

/**
 * Presentational: receives the current reaction as a prop and renders it.
 * Layers, back to front: glow → cast shadow → contact shadow → dog (+ accessory overlay)
 * → reaction overlay (hearts, bubble).
 */
export function DogStage({
  mood,
  dogName,
  dizzy,
  onPet,
  reaction,
  bubbleLineIndex,
  accessory,
}: {
  mood: DogMood;
  dogName: string;
  dizzy?: boolean;
  onPet?: () => void;
  reaction?: PetReactionKind | null;
  bubbleLineIndex?: number;
  accessory?: ReactNode;
}) {
  const { t } = useTranslation();
  const src = DOG_IMAGE_BY_MOOD[mood];
  const image = useImageAvailable(src);
  const look = MOOD_LOOKS[mood];

  if (!image.available) return <div className="dog-stage" />;

  const reactionClass = reaction ? ` is-${reaction}` : "";
  const dizzyClass = dizzy ? " is-dizzy" : "";
  const bubbleLine = reaction === "bubble" && bubbleLineIndex !== undefined
    ? t(`pet.lines.${BUBBLE_LINE_KEYS[bubbleLineIndex % BUBBLE_LINE_KEYS.length]}`, { name: dogName })
    : "";

  return (
    <div className={`dog-stage dog-stage--${mood}`} style={{ "--dog-glow": look.glow } as CSSProperties}>
      <div className="dog-stage__figure">
        <span className="dog-stage__glow" aria-hidden="true" />
        <span className="dog-stage__cast-shadow" aria-hidden="true" />
        <span className="dog-stage__contact-shadow" aria-hidden="true" />
        {reaction === "hearts" && (
          <span className="dog-stage__hearts" aria-hidden="true">
            <span className="dog-stage__heart dog-stage__heart--1"><Icon name="heart" size={20} /></span>
            <span className="dog-stage__heart dog-stage__heart--2"><Icon name="heart" size={20} /></span>
            <span className="dog-stage__heart dog-stage__heart--3"><Icon name="heart" size={20} /></span>
          </span>
        )}
        {reaction === "bubble" && (
          <div className="dog-stage__bubble" aria-live="polite" role="status">
            {bubbleLine}
          </div>
        )}
        {dizzy && (
          <span className="dog-stage__stars" aria-hidden="true">
            <span className="dog-stage__star dog-stage__star--1"><Icon name="star" size={16} /></span>
            <span className="dog-stage__star dog-stage__star--2"><Icon name="star" size={14} /></span>
            <span className="dog-stage__star dog-stage__star--3"><Icon name="star" size={12} /></span>
          </span>
        )}
        <button
          type="button"
          className={`dog-stage__pet${reactionClass}${dizzyClass}`}
          onClick={dizzy ? undefined : onPet}
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
