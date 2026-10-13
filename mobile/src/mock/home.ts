import type { Pet, Dose, Medication, MedicationExplanation, NudgeSettings, WeekSummary, BloodPressureReading, ScreeningInfo, ActivityLink, ClinicTask } from "../types";

export const pet: Pet = {
  name: "max",
  heartCount: 2,
  maxHearts: 4,
  careScore: 86,
  streak: 12,
  caringDays: 12,
};

export const doses: Dose[] = [
  { time: "9:00 AM", name: "Gabapentin", dose: "50 mg · 1 capsule", status: "Taken" },
  { time: "1:00 PM", name: "Apoquel", dose: "3.6 mg · with food", status: "Take now" },
  { time: "8:00 PM", name: "Gabapentin", dose: "50 mg · 1 capsule", status: "Later" },
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
  message: "Max will give a gentle woof.",
};

export const weekSummary: WeekSummary = {
  rating: "Good week",
  caringDays: 6,
  totalDays: 7,
  metrics: [
    { value: "12 / 14", label: "medicines taken" },
    { value: "3", label: "walks with Max" },
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
