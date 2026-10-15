import type { Caregiver, RestockAlert } from "../types";

export const caregiver: Caregiver = {
  seniorName: "Rose",
  caretakerName: "Jamie",
  names: "Rose + Jamie",
  relationship: "Two people, one Buddy",
  status: "Connected",
};

/** Low supply shown on the phone's Reminders screen (restock help, demo only). Same id as the mock Gabapentin doses. */
export const restockAlert: RestockAlert = {
  medicationId: "med-gaba",
  name: "Gabapentin",
  daysRemaining: 4,
};

export { weekSummary, bloodPressureReading, screeningInfo, activityLink, clinicTasks } from "./home";
