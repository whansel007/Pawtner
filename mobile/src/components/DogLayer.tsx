import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { DogMood } from "../../../shared/contract";
import { dogPlacementFor } from "../config/scene";
import { bubbleLineKey } from "../config/pet";
import { useSceneGround } from "../lib/useSceneGround";
import { useSceneLayout } from "../lib/useSceneLayout";
import { usePetReaction } from "../lib/usePetReaction";
import { useBuddyClip } from "../lib/useBuddyClip";
import { useMilestones } from "../lib/useMilestones";
import { withStreak } from "../lib/demoUnlocks";
import { earnedPerformances, hasHeartsToPlay, type TrickRequest } from "../lib/tricks";
import type { Screen } from "../types";
import { DogStage } from "./DogStage";
import { PetBubble } from "./PetBubble";
import "./DogLayer.css";

/**
 * The companion dog as a shared scene layer, so it stays with the senior on every screen (not /care).
 * The layer spans from the top of the column down to the current screen's ground line; DogStage stands the dog on its floor.
 * Where it stands comes from config/scene.ts (portrait vs two-column landscape); this component only composes.
 * Also renders the lawn marker (ground for landscape screens without chips) and the tap speech bubble.
 * Buddy's video clips (useBuddyClip) play from the Wave trick (a tap or the Wave card) or, once, after a fresh heart
 * (celebrateRequest from App). Which tricks the tap rotation includes comes from Milestones' earned tricks (useMilestones).
 * `trickRequest` (from a trick card on Milestones, via App) makes Buddy perform that trick once.
 */
export function DogLayer({
  screen,
  mood,
  dogName,
  dizzy,
  accessory,
  celebrateRequest = 0,
  trickRequest = null,
  heartCount,
  streak,
}: {
  screen: Screen;
  mood: DogMood;
  dogName: string;
  dizzy?: boolean;
  accessory?: ReactNode;
  /** Bumped by App after "Give Buddy a heart"; Home then plays the joyful clip once. */
  celebrateRequest?: number;
  /** Set by App when a trick card is tapped; a new id plays the trick once. */
  trickRequest?: TrickRequest | null;
  /** Today's hearts (0–4): Buddy plays from PLAY_MIN_HEARTS up. */
  heartCount: number;
  /** The streak shown on the phone (App: real, or the Settings demo days tick); earns tricks such as Wave. */
  streak: number;
}) {
  const { t } = useTranslation();
  const anchor = useRef<HTMLDivElement>(null);
  const layout = useSceneLayout();
  const placement = dogPlacementFor(screen, layout);
  useSceneGround(anchor, placement, screen);
  const clip = useBuddyClip({ mood, screen, dizzy: Boolean(dizzy), celebrateRequest });
  const { tricks } = useMilestones();
  const earned = useMemo(() => earnedPerformances(tricks ? withStreak(tricks, streak) : tricks), [tricks, streak]);
  // Hearts decide play (config/pet.ts PLAY_MIN_HEARTS); mood from readings never does.
  const canPlay = hasHeartsToPlay(heartCount);
  const reaction = usePetReaction(earned, canPlay, { kind: canPlay ? clip.waveClip : null, busy: clip.view !== null, play: clip.play });
  const { perform } = reaction;
  const handledTrick = useRef(trickRequest?.id ?? 0);

  // A trick card was tapped: perform it once (only while the dog is on screen).
  useEffect(() => {
    if (!trickRequest || trickRequest.id === handledTrick.current) return;
    handledTrick.current = trickRequest.id;
    if (placement) perform(trickRequest.performance);
  }, [trickRequest, placement, perform]);
  const bubbleText = !placement || reaction.active !== "bubble" ? ""
    : reaction.prompt ? t("pet.lowHeart", { name: dogName })
    : t(bubbleLineKey(reaction.bubbleLineIndex), { name: dogName });

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
