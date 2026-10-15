import type { Caregiver, RestockAlert } from "../types";

export const caregiver: Caregiver = {
  seniorName: "Rose",
  caretakerName: "Jamie",
  names: "Rose + Jamie",
  relationship: "Two people, one Buddy",
  status: "Connected",
};

export const restockAlert: RestockAlert = {
  name: "Gabapentin",
  daysRemaining: 4,
  label: "RESTOCK SOON",
};

export { weekSummary, bloodPressureReading, screeningInfo, activityLink, clinicTasks } from "./home";
