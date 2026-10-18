/** Demo thresholds only. These values are not clinical advice. */
export const DEMO_RULES = {
  nudgeDelayMinutes: 60,
  nudgeIntervalMinutes: 60,
  maxNudgesPerDose: 2,
  /** Caretaker check-ins: days in a row with a missed dose (user, 16 Oct). One day is allowed (migration 006). */
  caretakerMinimumThreshold: 1,
  defaultCaretakerThreshold: 1,
  restockDaysOfSupply: 5,
  /**
   * Blood pressure is judged against the person's FIRST reading (user, 16 Oct): more than this many points
   * above it on either number is a Warning (measurement wobble allowed).
   */
  bpFirstReadingSlack: 5,
  /** At or below both of these, a reading is "in the normal range" (Good job). Demo values, not clinical advice. */
  bpNormalSystolic: 120,
  bpNormalDiastolic: 80,
  /**
   * Hearts (user, 16 Oct): each of the day's three activities earns one, up to `heartMaximum` (all of the day's
   * medicines taken, the day's first blood-pressure measurement, the day's first walk with the dog). Every
   * `heartDecayHours` without a new heart, the dog loses one, never below `heartMinimum`; each heart earned restarts
   * that timer. History starts at the minimum.
   */
  heartMinimum: 1,
  heartMaximum: 4,
  heartDecayHours: 12,
  /**
   * At or below this many hearts Buddy is sad (sleepy face) whatever the latest decision, and doesn't play
   * (the phone asks for a heart instead). User, 16 Oct. One source for shared/rules.ts and mobile/src/config/pet.ts.
   */
  lowHeartMaximum: 1,
  streakMilestones: [3, 7, 14, 30] as const,
  /** Minutes the dog stays joyful after a celebrate decision before reverting to heart-based mood. */
  celebrateJoyfulMinutes: 30,
  /** Longest "For my next visit" note, in characters: the phone caps it, the API rejects longer shared notes. */
  visitNoteMaxLength: 300,
} as const;

/** In the latest reading's note, these mean Warning whatever the numbers (emergency signs at any reading). */
export const EMERGENCY_SYMPTOM_KEYWORDS = [
  "chest pain",
  "breathlessness",
  "shortness of breath",
  "fainting",
  "fainted",
  "confusion",
  "one-sided weakness",
  "slurred speech",
] as const;

export const POSSIBLE_SIDE_EFFECT_KEYWORDS = ["sleepy", "dizzy", "nausea"] as const;

export const REFUSAL_RULES = {
  double_dose: "Please don't take two. Check your label or ask your pharmacist what to do.",
  change_medication: "I can't advise changing, skipping or stopping a medicine. Please ask your doctor or pharmacist.",
  reading_reassurance: "I can't tell you whether a reading is fine. I can show the reading and what the app's demo rules recommend.",
  diagnosis: "I can't diagnose symptoms. Please ask a healthcare professional; urgent symptoms follow the app's emergency rules.",
  pill_identification: "I can't identify a pill from a photo. The photo can only be saved as proof.",
  interaction_advice: "I can't advise about medicine interactions. Please ask your pharmacist.",
} as const;
