export interface Pet {
  /** Display name shown in the top zone, lowercased per design */
  name: string;
  /** Current heart count (0–4) derived from doses taken + BP logged */
  heartCount: number;
  /** Max hearts the bar can show */
  maxHearts: number;
  /** Care-progress score shown on the care screen */
  careScore: number;
  /** Streak count shown as the flame chip on home */
  streak: number;
  /** Total caring days together, shown on milestones */
  caringDays: number;
}

export interface Dose {
  /** Clock-face time string, e.g. "9:00 AM" */
  time: string;
  /** Medicine name */
  name: string;
  /** Dose description, e.g. "50 mg · 1 capsule" */
  dose: string;
  /** Status label for the button, e.g. "Taken", "Take now", "Later" */
  status: string;
}

export interface Medication {
  /** Scanned medication name */
  name: string;
  /** Dosage amount string */
  dosage: string;
  /** Dosing frequency description */
  frequency: string;
  /** Days of supply remaining before restock */
  daysRemaining: number;
  /** Whether this was scanned from a label */
  scanned: boolean;
}

export interface ExplanationPoint {
  /** Section heading, e.g. "When?" */
  label: string;
  /** Plain-language body text */
  text: string;
}

export interface MedicationExplanation {
  /** Medicine name uppercased */
  name: string;
  /** Dosage uppercased */
  dosage: string;
  /** One-line summary */
  summary: string;
  /** Full sentence spoken by speech synthesis */
  spokenText: string;
  /** Structured Q&A points */
  points: ExplanationPoint[];
}

export interface NudgeSlot {
  /** Period label, e.g. "Morning" */
  label: string;
  /** Clock-face time string */
  time: string;
  /** Context note, e.g. "After breakfast" */
  note: string;
}

export interface NudgeSettings {
  /** Suggested nudge slots derived from the label */
  slots: NudgeSlot[];
  /** Tone of the nudge message */
  tone: string;
  /** Full nudge message text */
  message: string;
}

export interface WeekSummary {
  /** Overall rating label, e.g. "Good week" */
  rating: string;
  /** Number of caring days out of the week total */
  caringDays: number;
  /** Total days in the period */
  totalDays: number;
  /** Aggregate metrics */
  metrics: { value: string; label: string }[];
  /** Suggested question to ask the doctor */
  doctorQuestion: string;
}

export interface ClinicTask {
  /** Task title */
  title: string;
  /** Short description */
  subtitle: string;
  /** Completed count */
  done: number;
  /** Total count */
  total: number;
}

export interface BloodPressureReading {
  /** Systolic value */
  systolic: number;
  /** Diastolic value */
  diastolic: number;
  /** Whether a reading was logged today */
  logged: boolean;
  /** Context note when logged */
  note: string;
  /** Context note when not yet logged */
  pendingNote: string;
}

export interface ScreeningInfo {
  /** Screening programme name */
  title: string;
  /** Description */
  description: string;
  /** External URL to book/check eligibility */
  url: string;
  /** Whether completing it unlocks a festival */
  unlocksFestival: boolean;
}

export interface ActivityLink {
  /** Link title */
  title: string;
  /** Short subtitle */
  subtitle: string;
  /** External URL */
  url: string;
}

export interface MilestoneWorld {
  /** World id */
  id: World;
  /** Display label */
  label: string;
  /** Short note */
  note: string;
  /** Whether it is the current world */
  current: boolean;
  /** Whether it is unlocked */
  unlocked: boolean;
  /** Level-up banner text */
  levelText: string;
  /** Description shown on the world card */
  description: string;
  /** Progress 0–1 */
  progress: number;
}

export interface Trick {
  /** Trick name */
  name: string;
  /** Status note, e.g. "7 day streak" or "18 days to go" */
  note: string;
  /** Whether it has been earned */
  earned: boolean;
}

export interface Souvenir {
  /** Distance label */
  distance: string;
  /** Souvenir name */
  name: string;
  /** Short note */
  note: string;
}

export interface Caregiver {
  /** Combined names, e.g. "Mum + Jamie" */
  names: string;
  /** Caretaker display name, e.g. "Jamie" */
  caretakerName: string;
  /** Relationship note */
  relationship: string;
  /** Connection status */
  status: string;
}

export interface CareActivity {
  /** Doses taken summary, e.g. "2 of 3" */
  dosesTaken: string;
  /** Doses taken count */
  dosesTakenCount: number;
  /** Doses total */
  dosesTotal: number;
  /** Walk distance today */
  walkDistance: string;
  /** Timestamp of latest activity */
  timestamp: string;
  /** Activity description */
  description: string;
}

export interface RestockAlert {
  /** Medicine name */
  name: string;
  /** Days remaining */
  daysRemaining: number;
  /** Label, e.g. "RESTOCK SOON" */
  label: string;
}

export interface AccessoryOption {
  /** Accessory id */
  id: Accessory;
  /** Display label */
  label: string;
  /** Short note */
  note: string;
}

export interface WorldOption {
  /** World id */
  id: World;
  /** Display label */
  label: string;
  /** Short note */
  note: string;
}

export interface WalkStats {
  /** Duration string, e.g. "18:24" */
  duration: string;
  /** Distance string, e.g. "0.92 km" */
  distance: string;
  /** Step count */
  steps: string;
  /** Calories burned */
  calories: string;
  /** Speed string */
  speed: string;
  /** Today's goal text */
  goal: string;
  /** Gentle-note explanation */
  gentleNote: string;
}

// Re-export shared types so screens can import everything from types/
import type { Screen, World, Accessory } from "./common";
export type { Screen, World, Accessory };
