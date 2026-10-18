import type { Caregiver, RestockAlert } from "../types";
import { DEMO_NAMES } from "../lib/demoNames";
import en from "../locales/en.json" with { type: "json" };

export const caregiver: Caregiver = {
  seniorName: DEMO_NAMES.senior,
  caretakerName: DEMO_NAMES.caretaker,
  // Same template as App's live value (care.pairNames); App replaces it with t("care.pairNames", …) anyway.
  names: en.care.pairNames.replace("{{senior}}", DEMO_NAMES.senior).replace("{{caretaker}}", DEMO_NAMES.caretaker),
  relationship: `Two people, one ${DEMO_NAMES.dog}`,
  status: "Connected",
};

/** Low supply shown on the phone's Reminders screen when offline (restock help). Same medicine as the seed's 4-day supply. */
export const restockAlert: RestockAlert = {
  medicationId: "med-tablet-b",
  name: "Fictional Tablet B",
  daysRemaining: 4,
};

export { weekSummary, bloodPressureReading, screeningInfo, activityLink, clinicTasks } from "./home";
