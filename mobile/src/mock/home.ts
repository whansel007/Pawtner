import type { Pet, Dose, Medication, MedicationExplanation, NudgeSettings, WeekSummary, BloodPressureReading, ScreeningInfo, ActivityLink, ClinicTask } from "../types";
import type { DerivedDose } from "../../../shared/contract";

/** Demo identifiers used by the mock agent flow. */
export const demoUser = { id: "user-demo" };
export const demoDog = { id: "dog-demo" };

export const pet: Pet = {
  name: "Buddy",
  heartCount: 2,
  maxHearts: 4,
  careScore: 86,
  streak: 12,
  caringDays: 12,
};

/** Mock lifetime hearts total until the API sends today.dog.heartsTotal. */
export const heartsTotal = 30;

export const doses: Dose[] = [
  { time: "9:00 AM", name: "Gabapentin", dose: "50 mg · 1 capsule", status: "Taken" },
  { time: "1:00 PM", name: "Apoquel", dose: "3.6 mg · with food", status: "Take now" },
  { time: "8:00 PM", name: "Gabapentin", dose: "50 mg · 1 capsule", status: "Later" },
];

/**
 * Contract-shaped mock doses for the compact next-dose card (T1-08/09).
 * Fictional data: one taken, one due, one upcoming.
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
    medicationId: "med-gaba",
    medicationName: "Gabapentin",
    strength: "50 mg",
    scheduledAt: todayAt(9, 0),
    status: "taken",
    eventAt: todayAt(9, 5),
    nudgeCount: 0,
    lastNudgeAt: null,
  },
  {
    id: "dose-002",
    medicationId: "med-apoq",
    medicationName: "Apoquel",
    strength: "3.6 mg",
    scheduledAt: todayAt(13, 0),
    status: "due",
    eventAt: null,
    nudgeCount: 1,
    lastNudgeAt: todayAt(12, 45),
  },
  {
    id: "dose-003",
    medicationId: "med-gaba",
    medicationName: "Gabapentin",
    strength: "50 mg",
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
  message: "Buddy will give a gentle woof.",
};

export const weekSummary: WeekSummary = {
  rating: "Good week",
  caringDays: 6,
  totalDays: 7,
  metrics: [
    { value: "12 / 14", label: "medicines taken" },
    { value: "3", label: "walks with Buddy" },
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
  title: "Doctor's tiny tasks",
  subtitle: "1 of 2 done · from your clinic memo",
  done: 1,
  total: 2,
};

export const screeningInfo: ScreeningInfo = {
  title: "Complete a Screen for Life check",
  description: "See subsidised screenings you may be eligible for.",
  url: "https://www.healthhub.sg/programmes/screen-for-life",
  unlocksFestival: true,
};

export const activityLink: ActivityLink = {
  title: "Activities near you",
  subtitle: "Open Healthy 365",
  url: "https://www.healthhub.sg/programmes/healthy365",
};
