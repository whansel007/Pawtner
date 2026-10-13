import type { DecisionKind } from "./contract.js";

export const DECISION_TEMPLATES: Record<DecisionKind, string> = {
  nudge: "I'm here with you. When you're ready, check your medicine schedule.",
  celebrate: "A lovely moment together. Your care routine is moving along.",
  restock_reminder: "Your supply may be getting low. Please check with your pharmacy when convenient.",
  doctor_question: "Would you like to ask your doctor or pharmacist about how you've been feeling?",
  see_gp_soon: "The app's demo rules suggest arranging a check with your GP soon. This is not medical advice.",
  emergency_995: "Call 995 now. This app cannot provide emergency care.",
  stay_quiet: "I'm here beside you.",
};
