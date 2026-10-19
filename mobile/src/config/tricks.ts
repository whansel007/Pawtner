/**
 * Buddy's tricks: what each earned trick lets him perform. No trick names or rules inside components.
 *
 * Tricks come from api.milestones() (offline: mock/milestones.ts). The contract gives a trick only a
 * name, a note and `earned`, so a trick is matched to its performance by its name here (one place).
 * Names must match api/repository.ts trickDefs. Tricks without an entry (Roll over, New trick) do nothing yet.
 */
export type TrickPerformance = "basic" | "wave";

export const TRICK_PERFORMANCE_BY_NAME: Readonly<Record<string, TrickPerformance>> = {
  /** Sit: the original tap reactions (hop, hearts, bubble, bark). */
  Sit: "basic",
  /** Wave: the wave clip (content face; the joyful clip when Buddy is joyful). Earned at a 7-day streak. */
  Wave: "wave",
};

/** Streak days each trick needs: one table for the API and the phone, shared/config.ts. */
export { TRICK_STREAK_DAYS } from "../../../shared/config.js";

/**
 * Where an earned Wave goes in the dog-tap rotation: after the basic reactions, so a full cycle is
 * hop → hearts → bubble → bark → wave. Earned tricks are appended in the order they were learned,
 * so the new trick is the "finale" of each cycle and the familiar reactions stay first.
 */
export const TRICK_ROTATION_ORDER: readonly TrickPerformance[] = ["wave"];
