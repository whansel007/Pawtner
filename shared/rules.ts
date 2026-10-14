import {
  DEMO_RULES,
  EMERGENCY_SYMPTOM_KEYWORDS,
  HIGH_READING_SYMPTOM_KEYWORDS,
  POSSIBLE_SIDE_EFFECT_KEYWORDS,
} from "./config.js";
import type { AgentDecision, AgentInput, DecisionKind, DogMood } from "./contract.js";
import { DECISION_TEMPLATES } from "./templates.js";

function includesAny(text: string, keywords: readonly string[]): boolean {
  const normalized = text.toLowerCase();
  return keywords.some((word) => normalized.includes(word));
}

function isHighReading(systolic: number, diastolic: number): boolean {
  return systolic >= DEMO_RULES.highSystolic || diastolic >= DEMO_RULES.highDiastolic;
}

export function selectDogMood(
  heart: number,
  latestDecision: Pick<AgentDecision, "decision" | "createdAt"> | null,
  now: string,
): DogMood {
  if (latestDecision?.decision === "emergency_995" || latestDecision?.decision === "see_gp_soon") return "attentive";
  if (latestDecision?.decision === "nudge") return "sleepy";

  // Celebrate decisions keep the dog joyful for a fixed window, then expire.
  if (latestDecision?.decision === "celebrate") {
    const elapsedMs = Date.parse(now) - Date.parse(latestDecision.createdAt);
    if (elapsedMs < DEMO_RULES.celebrateJoyfulMinutes * 60_000) return "joyful";
    // Window expired — fall through to heart-based mood (even at 4/4 hearts).
  } else if (heart >= DEMO_RULES.heartMaximum) {
    return "joyful";
  }

  if (latestDecision?.decision === "restock_reminder" || latestDecision?.decision === "doctor_question") return "content";
  if (heart <= 1) return "sleepy";
  return "content";
}

function decision(
  input: AgentInput,
  kind: DecisionKind,
  ruleId: string,
  reasoning: string,
  observations: AgentDecision["observations"],
  caretakerPing = false,
  targetDose?: Pick<AgentDecision, "scheduleId" | "scheduledFor">,
): AgentDecision {
  const base = {
    id: `decision-${Date.parse(input.now)}`,
    decision: kind,
    ruleId,
    observations,
    reasoning,
    wording: DECISION_TEMPLATES[kind],
    wordingSource: "template" as const,
    caretakerPing,
    refused: false,
    createdAt: input.now,
  };
  return { ...base, ...targetDose, mood: selectDogMood(input.dog.heart, { decision: kind, createdAt: input.now }, input.now) };
}

export function decide(input: AgentInput): AgentDecision {
  const nowMs = Date.parse(input.now);
  const metrics = input.healthMetrics.filter((metric) => Date.parse(metric.recordedAt) <= nowMs);
  const latestMetric = [...metrics].sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt))[0];
  const latestNote = latestMetric?.note ?? "";
  const emergencyNote = metrics.find((metric) => includesAny(metric.note ?? "", EMERGENCY_SYMPTOM_KEYWORDS));
  const highReadingSymptom = latestMetric && isHighReading(latestMetric.systolic, latestMetric.diastolic)
    && includesAny(latestNote, HIGH_READING_SYMPTOM_KEYWORDS);

  if (emergencyNote || highReadingSymptom) {
    return decision(input, "emergency_995", emergencyNote ? "emergency_symptom_note" : "bp_high_with_symptom",
      "A configured emergency symptom or a symptom with a high reading was recorded; emergency wording is fixed and uses no model.",
      { symptomDetected: true, highReading: Boolean(highReadingSymptom) });
  }

  const repeatedHighReadings = metrics.filter((metric) => {
    const withinWindow = nowMs - Date.parse(metric.recordedAt) <= DEMO_RULES.repeatedHighReadingWindowDays * 86_400_000;
    return withinWindow && metric.systolic >= DEMO_RULES.repeatedHighReadingSystolic && metric.diastolic >= DEMO_RULES.repeatedHighReadingDiastolic;
  });
  if (latestMetric && isHighReading(latestMetric.systolic, latestMetric.diastolic)) {
    return decision(input, "see_gp_soon", "bp_high_without_symptom",
      "A blood-pressure reading met a configured demo threshold without a detected symptom.",
      { systolic: latestMetric.systolic, diastolic: latestMetric.diastolic, symptomDetected: false });
  }
  if (repeatedHighReadings.length >= DEMO_RULES.repeatedHighReadingsRequired) {
    return decision(input, "see_gp_soon", "repeated_high_readings_7d",
      "Three or more readings met the configured demo threshold in the seven-day window.",
      { qualifyingReadings: repeatedHighReadings.length, windowDays: DEMO_RULES.repeatedHighReadingWindowDays });
  }

  const sideEffectMetric = [...metrics].reverse().find((metric) => includesAny(metric.note ?? "", POSSIBLE_SIDE_EFFECT_KEYWORDS));
  if (sideEffectMetric) {
    return decision(input, "doctor_question", "possible_side_effect_note",
      "A note contains a configured possible-side-effect keyword; add it as a question for a professional.",
      { noteRecordedAt: sideEffectMetric.recordedAt });
  }

  const caretaker = input.caretaker;
  if (caretaker?.optedIn && caretaker.threshold >= DEMO_RULES.caretakerMinimumThreshold
      && input.consecutiveMissedDoses >= caretaker.threshold) {
    return decision(input, "nudge", "repeated_misses_caretaker_check_in",
      "Consecutive missed doses reached the opted-in caretaker threshold.",
      { consecutiveMissedDoses: input.consecutiveMissedDoses, caretakerThreshold: caretaker.threshold }, true);
  }

  const missedDose = input.doses.find((dose) => {
    if (dose.status !== "missed" || dose.nudgeCount >= DEMO_RULES.maxNudgesPerDose) return false;
    if (dose.nudgeCount === 0) {
      return nowMs - Date.parse(dose.scheduledAt) >= DEMO_RULES.nudgeDelayMinutes * 60_000;
    }
    return dose.nudgeCount === 1 && dose.lastNudgeAt !== null
      && nowMs - Date.parse(dose.lastNudgeAt) >= DEMO_RULES.nudgeIntervalMinutes * 60_000;
  });
  if (missedDose) {
    const second = missedDose.nudgeCount === 1;
    return decision(input, "nudge", second ? "dose_nudge_2" : "dose_nudge_1",
      second ? "The dose remains untaken at least 60 minutes after the first nudge." : "The dose remains untaken at least 60 minutes after its scheduled time.",
      { scheduleId: missedDose.id, scheduledFor: missedDose.scheduledAt, nudgeCount: missedDose.nudgeCount + 1 }, false,
      { scheduleId: missedDose.id, scheduledFor: missedDose.scheduledAt });
  }

  const supplyEntry = Object.entries(input.daysOfSupplyByMedicationId)
    .find(([, days]) => days !== null && days <= DEMO_RULES.restockDaysOfSupply);
  if (supplyEntry) {
    return decision(input, "restock_reminder", "low_days_of_supply",
      "A medication's remaining supply reached the configured reminder threshold.",
      { medicationId: supplyEntry[0], daysOfSupply: supplyEntry[1] });
  }
  if (input.latestDoseEvent?.event === "taken" || input.walkFinished || input.streakMilestoneReached) {
    return decision(input, "celebrate", "care_milestone_completed",
      "A dose, walk or streak milestone was completed.",
      { doseTaken: input.latestDoseEvent?.event === "taken", walkFinished: Boolean(input.walkFinished), streakMilestoneReached: Boolean(input.streakMilestoneReached) });
  }
  return decision(input, "stay_quiet", "nothing_needs_attention", "No configured rule currently needs attention.", { heart: input.dog.heart });
}
