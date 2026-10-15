import type { Caregiver, RestockAlert } from "../types";

export const caregiver: Caregiver = {
  seniorName: "Rose",
  caretakerName: "Jamie",
  names: "Rose + Jamie",
  relationship: "Two people, one Buddy",
  status: "Connected",
};

/** Low supply shown on the phone's Reminders screen when offline (restock help). Same medicine as the seed's 4-day supply. */
export const restockAlert: RestockAlert = {
  medicationId: "med-tablet-b",
  name: "Fictional Tablet B",
  daysRemaining: 4,
};

export { weekSummary, bloodPressureReading, screeningInfo, activityLink, clinicTasks } from "./home";
