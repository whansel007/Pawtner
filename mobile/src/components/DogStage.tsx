import { type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { DogMood } from "../../../shared/contract";
import { DOG_IMAGE_BY_MOOD, MOOD_LOOKS } from "../config/scene";
import { useImageAvailable } from "../lib/useImageAvailable";
import type { PetReactionKind } from "../config/pet";
import "./DogStage.css";

const BUBBLE_LINES = ["happy1", "happy2", "happy3", "happy4"] as const;

/**
 * Presentational: receives the current reaction as a prop and renders it.
 * Layers, back to front: glow → cast shadow → contact shadow → dog (+ accessory overlay)
 * → reaction overlay (hearts, bubble).
 */
export function DogStage({
  mood,
  dogName,
  onPet,
  reaction,
  bubbleLineIndex,
  accessory,
}: {
  mood: DogMood;
  dogName: string;
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
  const bubbleLine = reaction === "bubble" && bubbleLineIndex !== undefined
    ? t(`pet.lines.${BUBBLE_LINES[bubbleLineIndex % BUBBLE_LINES.length]}`, { name: dogName })
    : "";

  return (
    <div className={`dog-stage dog-stage--${mood}`} style={{ "--dog-glow": look.glow } as CSSProperties}>
      <div className="dog-stage__figure">
        <span className="dog-stage__glow" aria-hidden="true" />
        <span className="dog-stage__cast-shadow" aria-hidden="true" />
        <span className="dog-stage__contact-shadow" aria-hidden="true" />
        {reaction === "hearts" && (
          <span className="dog-stage__hearts" aria-hidden="true">
            <span className="dog-stage__heart dog-stage__heart--1"><IconHeart /></span>
            <span className="dog-stage__heart dog-stage__heart--2"><IconHeart /></span>
            <span className="dog-stage__heart dog-stage__heart--3"><IconHeart /></span>
          </span>
        )}
        {reaction === "bubble" && (
          <div className="dog-stage__bubble" aria-live="polite" role="status">
            {bubbleLine}
          </div>
        )}
        <button
          type="button"
          className={`dog-stage__pet${reactionClass}`}
          onClick={onPet}
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

function IconHeart() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    </svg>
  );
}
