import type { Caregiver, CareActivity, RestockAlert, WeekSummary, BloodPressureReading, ScreeningInfo, ActivityLink, ClinicTask } from "../types";

export const caregiver: Caregiver = {
  names: "Jamie · Alex",
  caretakerName: "Jamie",
  relationship: "Jamie gets check-ins, Alex gets updates only",
  status: "Gets check-ins",
};

export const careActivity: CareActivity = {
  dosesTaken: "2 of 3",
  dosesTakenCount: 2,
  dosesTotal: 3,
  walkDistance: "1.8 km",
  timestamp: "12:42 PM",
  description: "Mum took her lunchtime medicine and Max gained a heart.",
};

export const restockAlert: RestockAlert = {
  name: "Gabapentin",
  daysRemaining: 4,
  label: "RESTOCK SOON",
};

export { weekSummary, bloodPressureReading, screeningInfo, activityLink, clinicTasks } from "./home";
