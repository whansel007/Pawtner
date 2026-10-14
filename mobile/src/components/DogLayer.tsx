import { useRef, type ReactNode } from "react";
import type { DogMood } from "../../../shared/contract";
import { dogPlacementFor } from "../config/scene";
import { useSceneGround } from "../lib/useSceneGround";
import { usePetReaction } from "../lib/usePetReaction";
import type { Screen } from "../types";
import { DogStage } from "./DogStage";
import "./DogLayer.css";

/**
 * The companion dog as a shared scene layer, so it stays with the senior on every screen (not /care).
 * The layer spans from the top of the column down to the current screen's ground line; DogStage stands the dog on its floor.
 */
export function DogLayer({
  screen,
  mood,
  dogName,
  accessory,
}: {
  screen: Screen;
  mood: DogMood;
  dogName: string;
  accessory?: ReactNode;
}) {
  const anchor = useRef<HTMLDivElement>(null);
  const placement = dogPlacementFor(screen);
  useSceneGround(anchor, placement, screen);
  const reaction = usePetReaction(mood, dogName);

  return (
    <div ref={anchor} className={`dog-layer ${placement ? `dog-layer--${placement}` : "dog-layer--hidden"}`}>
      {placement && (
        <DogStage
          mood={mood}
          dogName={dogName}
          onPet={reaction.onTap}
          reaction={reaction.active}
          bubbleLineIndex={reaction.bubbleLineIndex}
          accessory={accessory}
        />
      )}
    </div>
  );
}
