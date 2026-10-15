import type { DogMood } from "../../../shared/contract.js";
import type { PetReactionKind } from "../config/pet.js";
import { TRICK_PERFORMANCE_BY_NAME, TRICK_ROTATION_ORDER, type TrickPerformance } from "../config/tricks.js";

/**
 * Trick rules (pure, no React, no DOM), shared by usePetReaction, MilestonesScreen and the unit tests.
 */

/** The shape of a trick in MilestonesResponse (shared/contract.ts). */
export interface TrickLike {
  name: string;
  earned: boolean;
}

/** One step of the dog-tap rotation: a basic reaction (Sit) or the wave clip (Wave). */
export type TapStep = PetReactionKind | "wave";

/** The performance a trick card stands for, or null (no performance yet, e.g. Roll over). */
export function trickPerformance(trick: TrickLike): TrickPerformance | null {
  return TRICK_PERFORMANCE_BY_NAME[trick.name] ?? null;
}

/** true when the trick's card is a button: earned and Buddy has a performance for it. */
export function isPerformable(trick: TrickLike): boolean {
  return trick.earned && trickPerformance(trick) !== null;
}

/** Performances Buddy has earned. `tricks` null (still loading) → none. */
export function earnedPerformances(tricks: readonly TrickLike[] | null): Set<TrickPerformance> {
  const earned = new Set<TrickPerformance>();
  for (const trick of tricks ?? []) {
    const performance = trickPerformance(trick);
    if (trick.earned && performance) earned.add(performance);
  }
  return earned;
}

/**
 * The dog-tap rotation: the basic reactions first, then each earned trick that can play right now
 * (TRICK_ROTATION_ORDER). `waveCanPlay` is false when sleepy, attentive, dizzy, under reduced motion or
 * when the browser can't draw the clip, so the wave is skipped then.
 */
export function tapRotation(basic: readonly PetReactionKind[], earned: ReadonlySet<TrickPerformance>, waveCanPlay: boolean): TapStep[] {
  const extras: TapStep[] = TRICK_ROTATION_ORDER.flatMap((performance): TapStep[] =>
    performance === "wave" && earned.has("wave") && waveCanPlay ? ["wave"] : []);
  return [...basic, ...extras];
}

/** What tapping a trick card on Milestones does. */
export type TrickCardTap =
  /** Buddy does the next basic reaction. */
  | "basic"
  /** Buddy waves (or does a basic reaction if the clip can't play, see resolveTrickRequest). */
  | "wave"
  /** Buddy is too sleepy to wave: show the gentle line instead. */
  | "sleepyLine"
  /** Nothing: locked trick, a trick without a performance, or a calm (attentive) moment. */
  | "none";

export function trickCardTap(trick: TrickLike, mood: DogMood): TrickCardTap {
  const performance = trickPerformance(trick);
  if (!trick.earned || !performance || mood === "attentive") return "none";
  if (performance === "wave" && mood === "sleepy") return "sleepyLine";
  return performance;
}

/**
 * What the dog actually does for a card's request. A wave request falls back to a basic reaction when
 * the clip can't play for a reason the card can't know (reduced motion, dizzy, unsupported browser),
 * so the tap never feels dead. Sleepy never reaches here (the card shows its line instead).
 */
export function resolveTrickRequest(performance: TrickPerformance, waveCanPlay: boolean): TrickPerformance {
  return performance === "wave" && !waveCanPlay ? "basic" : performance;
}

/** A trick card's request to DogLayer (App state): a fresh id per tap, so the same trick can repeat. */
export interface TrickRequest {
  id: number;
  performance: TrickPerformance;
}
