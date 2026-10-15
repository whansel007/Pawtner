import { useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { DogMood } from "../../../shared/contract";
import { dogPlacementFor } from "../config/scene";
import { bubbleLineKey } from "../config/pet";
import { useSceneGround } from "../lib/useSceneGround";
import { useSceneLayout } from "../lib/useSceneLayout";
import { usePetReaction } from "../lib/usePetReaction";
import { useBuddyClip } from "../lib/useBuddyClip";
import type { Screen } from "../types";
import { DogStage } from "./DogStage";
import { PetBubble } from "./PetBubble";
import "./DogLayer.css";

/**
 * The companion dog as a shared scene layer, so it stays with the senior on every screen (not /care).
 * The layer spans from the top of the column down to the current screen's ground line; DogStage stands the dog on its floor.
 * Where it stands comes from config/scene.ts (portrait vs two-column landscape); this component only composes.
 * Also renders the lawn marker (ground for landscape screens without chips) and the tap speech bubble.
 * Buddy's video clips (useBuddyClip) play from a tap or, once, after a fresh heart (celebrateRequest from App).
 */
export function DogLayer({
  screen,
  mood,
  dogName,
  dizzy,
  accessory,
  celebrateRequest = 0,
}: {
  screen: Screen;
  mood: DogMood;
  dogName: string;
  dizzy?: boolean;
  accessory?: ReactNode;
  /** Bumped by App after "Give Buddy a heart"; Home then plays the joyful clip once. */
  celebrateRequest?: number;
}) {
  const { t } = useTranslation();
  const anchor = useRef<HTMLDivElement>(null);
  const layout = useSceneLayout();
  const placement = dogPlacementFor(screen, layout);
  useSceneGround(anchor, placement, screen);
  const clip = useBuddyClip({ mood, screen, dizzy: Boolean(dizzy), celebrateRequest });
  const reaction = usePetReaction(mood, { kind: clip.tapClip, busy: clip.view !== null, play: clip.play });
  const bubbleText = placement && reaction.active === "bubble" ? t(bubbleLineKey(reaction.bubbleLineIndex), { name: dogName }) : "";

  return (
    <>
      <div className="scene-ground" aria-hidden="true" />
      <div ref={anchor} className={`dog-layer ${placement ? `dog-layer--${placement}` : "dog-layer--hidden"}`}>
        {placement && (
          <DogStage
            mood={mood}
            dogName={dogName}
            dizzy={dizzy}
            onPet={reaction.onTap}
            reaction={reaction.active}
            accessory={accessory}
            clip={clip.view}
          />
        )}
      </div>
      <PetBubble text={bubbleText} />
    </>
  );
}
