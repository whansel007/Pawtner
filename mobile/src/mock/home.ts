import type { Pet, Dose, Medication, MedicationExplanation, NudgeSettings, WeekSummary, BloodPressureReading, ScreeningInfo, ActivityLink, ClinicTask } from "../types";
import type { DerivedDose } from "../../../shared/contract";
import { DEMO_NAMES } from "../lib/demoNames";

/** Demo identifiers used by the mock agent flow. */
export const demoUser = { id: "user-demo" };
export const demoDog = { id: "dog-demo" };

export const pet: Pet = {
  name: DEMO_NAMES.dog,
  heartCount: 2,
  maxHearts: 4,
  careScore: 86,
  streak: 12,
  caringDays: 12,
};

/** Mock lifetime hearts total until the API sends today.dog.heartsTotal. */
export const heartsTotal = 30;

export const doses: Dose[] = [
  { time: "10:00 AM", name: "Fictional Tablet A", dose: "5 mg", status: "Taken" },
  { time: "8:00 PM", name: "Fictional Tablet B", dose: "10 mg", status: "Later" },
];

/**
 * Contract-shaped mock doses for the compact next-dose card (T1-08/09), shown offline.
 * Same two medicines and times as the fictional seed (migrations/seed.sql): one taken, one upcoming.
 * Real medicines (e.g. Twynsta) are added during testing through Add a medication (user, 16 Oct).
 * Uses today's date so times render meaningfully.
 */
function todayAt(hour: number, minute: number): string {
  const now = new Date();
  now.setHours(hour, minute, 0, 0);
  return now.toISOString();
}

export const todayDoses: DerivedDose[] = [
  {
    id: "dose-001",
    medicationId: "med-tablet-a",
    medicationName: "Fictional Tablet A",
    strength: "5 mg",
    scheduledAt: todayAt(10, 0),
    status: "taken",
    eventAt: todayAt(10, 5),
    nudgeCount: 0,
    lastNudgeAt: null,
  },
  {
    id: "dose-002",
    medicationId: "med-tablet-b",
    medicationName: "Fictional Tablet B",
    strength: "10 mg",
    scheduledAt: todayAt(20, 0),
    status: "upcoming",
    eventAt: null,
    nudgeCount: 0,
    lastNudgeAt: null,
  },
];

export const medication: Medication = {
  name: "Gabapentin",
  dosage: "50 mg",
  frequency: "Twice daily",
  daysRemaining: 4,
  scanned: false,
};

export const medicationExplanation: MedicationExplanation = {
  name: "GABAPENTIN",
  dosage: "50 MG",
  summary: "Helps settle nerve pain",
  spokenText: "Gabapentin helps settle nerve pain. Take one capsule in the morning and one at night. It may make you sleepy.",
  points: [
    { label: "When?", text: "One capsule in the morning and one at night." },
    { label: "With food?", text: "Either is okay. Food may feel gentler on your stomach." },
    { label: "Good to know", text: "It may make you sleepy. Take your time standing up." },
  ],
};

export const nudgeSettings: NudgeSettings = {
  slots: [
    { label: "Morning", time: "9:00 AM", note: "After breakfast" },
    { label: "Night", time: "8:00 PM", note: "After dinner" },
  ],
  tone: "gentle",
  message: `${DEMO_NAMES.dog} will give a gentle woof.`,
};

export const weekSummary: WeekSummary = {
  rating: "Good week",
  caringDays: 6,
  totalDays: 7,
  metrics: [
    { value: "12 / 14", label: "medicines taken" },
    { value: "3", label: `walks with ${DEMO_NAMES.dog}` },
    { value: "128 / 78", label: "latest blood pressure" },
    { value: "1 new", label: "trick learned" },
  ],
  doctorQuestion: "Is the sleepiness I feel in the evening expected?",
};

export const bloodPressureReading: BloodPressureReading = {
  systolic: 128,
  diastolic: 78,
  logged: false,
  note: "Logged today · in your usual range",
  pendingNote: "Log it to fill today's last heart",
};

export const clinicTasks: ClinicTask = {
  title: "From the Doctor",
};

export const screeningInfo: ScreeningInfo = {
  title: "Complete a Screen for Life check",
  description: "See subsidised screenings you may be eligible for.",
  url: "https://www.healthhub.sg/programmes/screen_for_life",
  unlocksFestival: true,
};

export const activityLink: ActivityLink = {
  title: "Link to Healthy 365",
  subtitle: "Activities near you",
  url: "https://www.healthhub.sg/programmes/healthyliving",
  /** User-supplied logo, 192×192 transparent WebP. */
  logoSrc: "/assets/healthy365-logo.webp",
  logoAlt: "Healthy 365",
};
