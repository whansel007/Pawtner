import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { DogMood } from "../../../shared/contract";
import { dogPlacementFor } from "../config/scene";
import { bubbleLineKey, PET_REACTIONS } from "../config/pet";
import { celebrationFor, type CelebrationReason } from "../lib/celebration";
import { useReducedMotion } from "../lib/useReducedMotion";
import { useSceneGround } from "../lib/useSceneGround";
import { sceneGroundKey } from "../lib/homeView";
import { useSceneLayout } from "../lib/useSceneLayout";
import { usePetReaction } from "../lib/usePetReaction";
import { useBuddyClip } from "../lib/useBuddyClip";
import { useMilestones } from "../lib/useMilestones";
import { withStreak } from "../lib/demoUnlocks";
import { earnedPerformances, hasHeartsToPlay, type TrickRequest } from "../lib/tricks";
import type { Screen } from "../types";
import type { HomeView } from "../config/homeView";
import { DogStage } from "./DogStage";
import { PetBubble } from "./PetBubble";
import "./DogLayer.css";

/**
 * The companion dog as a shared scene layer, so it stays with the senior on every screen (not /care).
 * The layer spans from the top of the column down to the current screen's ground line; DogStage stands the dog on its floor.
 * Where it stands comes from config/scene.ts (portrait vs two-column landscape); this component only composes.
 * Also renders the lawn marker (ground for landscape screens without chips) and the tap speech bubble.
 * Buddy's video clips (useBuddyClip) play from the Wave trick (a tap or the Wave card) or, once, after a fresh heart
 * (celebrateRequest / encourageRequest from App, played by the one rule in lib/celebration.ts). Which tricks the tap rotation includes comes from Milestones' earned tricks (useMilestones).
 * `trickRequest` (from a trick card on Milestones, via App) makes Buddy perform that trick once.
 */
export function DogLayer({
  screen,
  sheetView,
  mood,
  dogName,
  dizzy,
  accessory,
  celebrateRequest = 0,
  encourageRequest = 0,
  trickRequest = null,
  heartCount,
  streak,
}: {
  screen: Screen;
  /** The dragged card's view on this screen (lib/homeView.ts sheetViewFor), null where nothing drags: where Buddy stands comes and goes with it. */
  sheetView: HomeView | null;
  mood: DogMood;
  dogName: string;
  dizzy?: boolean;
  accessory?: ReactNode;
  /** Bumped by App when a walk or the day's last dose earned a heart: Buddy celebrates once (lib/celebration.ts). */
  celebrateRequest?: number;
  /** Bumped by App after a walk that didn't reach the day's goal yet: Buddy says "Just a little bit more!". */
  encourageRequest?: number;
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
  const placement = dogPlacementFor(screen, layout, sheetView);
  useSceneGround(anchor, placement, sceneGroundKey(screen, sheetView));
  const clip = useBuddyClip({ mood, screen, dizzy: Boolean(dizzy) });
  const { tricks } = useMilestones();
  const earned = useMemo(() => earnedPerformances(tricks ? withStreak(tricks, streak) : tricks), [tricks, streak]);
  // Hearts decide play (config/pet.ts PLAY_MIN_HEARTS); mood from readings never does.
  const canPlay = hasHeartsToPlay(heartCount);
  const reaction = usePetReaction(earned, canPlay, { kind: canPlay ? clip.waveClip : null, busy: clip.view !== null, play: clip.play });
  const { perform, celebrate } = reaction;
  const handledTrick = useRef(trickRequest?.id ?? 0);
  const reducedMotion = useReducedMotion();
  // Celebration bubble (e.g. "Just a little bit more!"): its own line, shown for a bubble's time.
  const [celebrationBubble, setCelebrationBubble] = useState<string | null>(null);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (bubbleTimer.current) clearTimeout(bubbleTimer.current); }, []);
  const handledCelebrate = useRef(celebrateRequest);
  const handledEncourage = useRef(encourageRequest);

  // A celebration from App: played once the dog is on screen, by the one rule (lib/celebration.ts).
  useEffect(() => {
    if (!placement) return;
    const run = (reason: CelebrationReason) => {
      const { animation, bubbleKey } = celebrationFor(reason, { waveEarned: earned.has("wave"), waveCanPlay: clip.waveClip !== null, noMotion: reducedMotion || Boolean(dizzy) });
      if (animation) celebrate(animation);
      if (!bubbleKey) return;
      setCelebrationBubble(bubbleKey);
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
      bubbleTimer.current = setTimeout(() => setCelebrationBubble(null), PET_REACTIONS.duration.bubble);
    };
    if (celebrateRequest !== handledCelebrate.current) { handledCelebrate.current = celebrateRequest; run("heartEarned"); }
    if (encourageRequest !== handledEncourage.current) { handledEncourage.current = encourageRequest; run("walkNotYet"); }
  }, [celebrateRequest, encourageRequest, placement, earned, clip.waveClip, reducedMotion, dizzy, celebrate]);

  // A trick card was tapped: perform it once (only while the dog is on screen).
  useEffect(() => {
    if (!trickRequest || trickRequest.id === handledTrick.current) return;
    handledTrick.current = trickRequest.id;
    if (placement) perform(trickRequest.performance);
  }, [trickRequest, placement, perform]);
  const bubbleText = !placement ? ""
    : celebrationBubble ? t(celebrationBubble, { name: dogName })
    : reaction.active !== "bubble" ? ""
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
