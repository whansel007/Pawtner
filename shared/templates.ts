import type { DecisionKind } from "./contract.js";

export const DECISION_TEMPLATES: Record<DecisionKind, string> = {
  nudge: "I'm here with you. When you're ready, check your medicine schedule.",
  celebrate: "A lovely moment together. Your care routine is moving along.",
  restock_reminder: "Your supply may be getting low. Please check with your pharmacy when convenient.",
  doctor_question: "Would you like to ask your doctor or pharmacist about how you've been feeling?",
  // One warning (owner, 18 Oct: "see doctor immediately" for all); its message follows the condition, like the card line.
  see_gp_soon: "This reading is higher than your first reading.",
  // No longer decided (an emergency sign is now a see_gp_soon warning); kept so warnings saved before still read.
  emergency_995: "Your note mentioned a sign that can be serious.",
  stay_quiet: "I'm here beside you.",
};

/** The warning's message when the latest reading's note has an emergency sign (same line as the card's reason). */
export const WARNING_EMERGENCY_SIGN_WORDING = "Your note mentioned a sign that can be serious.";
