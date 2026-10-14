/** Demo thresholds only. These values are not clinical advice. */
export const DEMO_RULES = {
  nudgeDelayMinutes: 60,
  nudgeIntervalMinutes: 60,
  maxNudgesPerDose: 2,
  caretakerMinimumThreshold: 2,
  defaultCaretakerThreshold: 2,
  restockDaysOfSupply: 5,
  highSystolic: 180,
  highDiastolic: 120,
  repeatedHighReadingSystolic: 140,
  repeatedHighReadingDiastolic: 90,
  repeatedHighReadingsRequired: 3,
  repeatedHighReadingWindowDays: 7,
  heartMinimum: 0,
  heartMaximum: 4,
  heartScale: 4,
  heartWhenNothingDue: 2,
  heartBloodPressureBonus: 1,
  streakMilestones: [3, 7, 14, 30] as const,
  /** Minutes the dog stays joyful after a celebrate decision before reverting to heart-based mood. */
  celebrateJoyfulMinutes: 30,
} as const;

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

/** Symptoms paired with a high blood-pressure reading; includes the PRD demo's headache example. */
export const HIGH_READING_SYMPTOM_KEYWORDS = [
  ...EMERGENCY_SYMPTOM_KEYWORDS,
  "headache",
  "dizzy",
  "dizziness",
  "nausea",
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
