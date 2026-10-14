import type { Caregiver, CareActivity, RestockAlert, WeekSummary, BloodPressureReading, ScreeningInfo, ActivityLink, ClinicTask } from "../types";

export const caregiver: Caregiver = {
  names: "Mum + Jamie",
  caretakerName: "Jamie",
  relationship: "Two people, one Buddy",
  status: "Connected",
};

export const careActivity: CareActivity = {
  dosesTaken: "2 of 3",
  dosesTakenCount: 2,
  dosesTotal: 3,
  walkDistance: "1.8 km",
  timestamp: "12:42 PM",
  description: "Mum took her lunchtime medicine and Buddy gained a heart.",
};

export const restockAlert: RestockAlert = {
  name: "Gabapentin",
  daysRemaining: 4,
  label: "RESTOCK SOON",
};

export { weekSummary, bloodPressureReading, screeningInfo, activityLink, clinicTasks } from "./home";
