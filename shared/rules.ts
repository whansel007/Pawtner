import {
  DEMO_RULES,
  EMERGENCY_SYMPTOM_KEYWORDS,
  POSSIBLE_SIDE_EFFECT_KEYWORDS,
} from "./config.js";
import type { AgentDecision, AgentInput, DecisionKind, DogMood, HealthMetric } from "./contract.js";
import { DECISION_TEMPLATES } from "./templates.js";

function includesAny(text: string, keywords: readonly string[]): boolean {
  const normalized = text.toLowerCase();
  return keywords.some((word) => normalized.includes(word));
}

type Reading = Pick<HealthMetric, "id" | "systolic" | "diastolic" | "recordedAt">;

/** The person's first blood-pressure reading (earliest recorded), or null. Everything is compared with it. */
export function firstReadingOf<T extends Reading>(metrics: readonly T[]): T | null {
  return metrics.reduce<T | null>((first, metric) =>
    first === null || Date.parse(metric.recordedAt) < Date.parse(first.recordedAt) ? metric : first, null);
}

export type BloodPressureProgress = "first" | "warning" | "keepGoing" | "goodJob";

/**
 * A reading against the first one (user, 16 Oct): more than `bpFirstReadingSlack` above it on either number is a
 * Warning; at or below the normal line on both numbers is Good job; anything else is Keep at it. The first reading
 * itself is "first". One rule for the agent (decide) and the phone (Health feedback).
 */
export function bloodPressureProgress(reading: Reading, first: Reading | null): BloodPressureProgress {
  if (!first || reading.id === first.id) return "first";
  if (reading.systolic > first.systolic + DEMO_RULES.bpFirstReadingSlack
    || reading.diastolic > first.diastolic + DEMO_RULES.bpFirstReadingSlack) return "warning";
  if (reading.systolic <= DEMO_RULES.bpNormalSystolic && reading.diastolic <= DEMO_RULES.bpNormalDiastolic) return "goodJob";
  return "keepGoing";
}

export function selectDogMood(
  heart: number,
  latestDecision: Pick<AgentDecision, "decision" | "createdAt"> | null,
  now: string,
): DogMood {
  // Hearts lead at both ends, before any decision (user, 16 Oct): low hearts are the sad (sleepy) face,
  // full hearts are joyful. Decisions only shape the mood in between.
  if (heart <= DEMO_RULES.lowHeartMaximum) return "sleepy";
  if (heart >= DEMO_RULES.heartMaximum) return "joyful";
  if (latestDecision?.decision === "emergency_995" || latestDecision?.decision === "see_gp_soon") return "attentive";
  if (latestDecision?.decision === "nudge") return "sleepy";

  // Celebrate decisions keep the dog joyful for a fixed window, then expire (only matters below full hearts).
  if (latestDecision?.decision === "celebrate") {
    const elapsedMs = Date.parse(now) - Date.parse(latestDecision.createdAt);
    if (elapsedMs < DEMO_RULES.celebrateJoyfulMinutes * 60_000) return "joyful";
  }

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
  // Emergency signs typed in the latest reading's note: Warning whatever the numbers.
  if (latestMetric && includesAny(latestMetric.note ?? "", EMERGENCY_SYMPTOM_KEYWORDS)) {
    return decision(input, "emergency_995", "emergency_symptom_note",
      "The latest reading's note mentions a configured emergency symptom; the wording is fixed and uses no model.",
      { symptomDetected: true });
  }

  // Otherwise the numbers decide, against the first reading (user, 16 Oct).
  const firstReading = firstReadingOf(metrics);
  if (latestMetric && bloodPressureProgress(latestMetric, firstReading) === "warning" && firstReading) {
    return decision(input, "see_gp_soon", "bp_above_first_reading",
      "The latest blood-pressure reading is higher than the first reading by more than the configured slack.",
      { systolic: latestMetric.systolic, diastolic: latestMetric.diastolic, firstSystolic: firstReading.systolic, firstDiastolic: firstReading.diastolic });
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
