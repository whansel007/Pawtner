import {
  DEMO_RULES,
  EMERGENCY_SYMPTOM_KEYWORDS,
  POSSIBLE_SIDE_EFFECT_KEYWORDS,
} from "./config.js";
import type { AgentDecision, AgentInput, DecisionKind, DogMood, HealthMetric } from "./contract.js";
import { DECISION_TEMPLATES, WARNING_EMERGENCY_SIGN_WORDING } from "./templates.js";
import { localDay, sideEffectNoteCounts } from "./nextVisit.js";

function includesAny(text: string, keywords: readonly string[]): boolean {
  const normalized = text.toLowerCase();
  return keywords.some((word) => normalized.includes(word));
}

/** A reading note with an emergency sign (EMERGENCY_SYMPTOM_KEYWORDS). One rule for the agent and the phone. */
export function mentionsEmergencySign(note: string | null | undefined): boolean {
  return includesAny(note ?? "", EMERGENCY_SYMPTOM_KEYWORDS);
}

/**
 * What one reading means on its own (the phone's blood-pressure card and log): an emergency sign in its note, else
 * the comparison with her first reading (bloodPressureProgress). A warning is never "goodJob".
 */
export function readingStatus(reading: Reading & { note?: string | null }, first: Reading | null): "emergencySign" | BloodPressureProgress {
  return mentionsEmergencySign(reading.note) ? "emergencySign" : bloodPressureProgress(reading, first);
}

/** A reading note that may mention a possible side effect (POSSIBLE_SIDE_EFFECT_KEYWORDS). One rule for the agent and the phone. */
export function mentionsPossibleSideEffect(note: string | null | undefined): boolean {
  return includesAny(note ?? "", POSSIBLE_SIDE_EFFECT_KEYWORDS);
}

/**
 * The newest reading whose note may mention a side effect and still counts at `now`, or null. Used by the agent's
 * doctor_question rule and by Health's side-effect card, so both follow the same visit date.
 */
export function activeSideEffectNote<T extends { note: string | null; recordedAt: string }>(
  readings: readonly T[],
  now: string,
  timeZone: string,
  saved: string | null,
): T | null {
  const today = localDay(now, timeZone);
  return [...readings]
    .filter((reading) => Date.parse(reading.recordedAt) <= Date.parse(now))
    .sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt))
    .find((reading) => mentionsPossibleSideEffect(reading.note) && sideEffectNoteCounts(localDay(reading.recordedAt, timeZone), today, saved)) ?? null;
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
/** The same reading: same id, or (a phone's local copy vs the server's row) same numbers within a minute. */
export function isSameReading(a: Reading, b: Reading): boolean {
  return a.id === b.id || (a.systolic === b.systolic && a.diastolic === b.diastolic
    && Math.abs(Date.parse(a.recordedAt) - Date.parse(b.recordedAt)) < 60_000);
}

export function bloodPressureProgress(reading: Reading, first: Reading | null): BloodPressureProgress {
  if (!first || isSameReading(reading, first)) return "first";
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
  // full hearts are joyful. Decisions only shape the mood in between. The sad face comes ONLY from low hearts
  // (owner, 18 Oct: "neutral state should be neutral"): a nudge for a late dose barks and reminds, but doesn't
  // make Buddy sad.
  if (heart <= DEMO_RULES.lowHeartMaximum) return "sleepy";
  if (heart >= DEMO_RULES.heartMaximum) return "joyful";
  if (latestDecision?.decision === "emergency_995" || latestDecision?.decision === "see_gp_soon") return "attentive";

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
  // One warning for every condition (owner, 18 Oct: "They should be the same … All are see doctor immediately").
  // Emergency signs in the latest reading's note: the warning whatever the numbers, with its own line.
  if (latestMetric && mentionsEmergencySign(latestMetric.note)) {
    return {
      ...decision(input, "see_gp_soon", "emergency_symptom_note",
        "The latest reading's note mentions a configured emergency symptom; the wording is fixed and uses no model.",
        { symptomDetected: true }),
      wording: WARNING_EMERGENCY_SIGN_WORDING,
    };
  }

  // Otherwise the numbers decide, against the first reading (user, 16 Oct).
  const firstReading = firstReadingOf(metrics);
  if (latestMetric && bloodPressureProgress(latestMetric, firstReading) === "warning" && firstReading) {
    return decision(input, "see_gp_soon", "bp_above_first_reading",
      "The latest blood-pressure reading is higher than the first reading by more than the configured slack.",
      { systolic: latestMetric.systolic, diastolic: latestMetric.diastolic, firstSystolic: firstReading.systolic, firstDiastolic: firstReading.diastolic });
  }

  // Counts from the note until the end of the doctor's next visit (shared/nextVisit.ts; no date = that day only).
  const sideEffectMetric = activeSideEffectNote(metrics, input.now, input.timeZone ?? "UTC", input.nextDoctorVisit ?? null);
  if (sideEffectMetric) {
    return decision(input, "doctor_question", "possible_side_effect_note",
      "A note contains a configured possible-side-effect keyword; add it as a question for a professional.",
      { noteRecordedAt: sideEffectMetric.recordedAt });
  }

  const caretaker = input.caretaker;
  // Days, not doses (user, 16 Oct): once per missed day, so the rest of today still nudges and celebrates.
  if (caretaker?.optedIn && caretaker.threshold >= DEMO_RULES.caretakerMinimumThreshold
      && input.consecutiveMissedDays >= caretaker.threshold
      && input.lastMissedDay !== null && input.lastMissedDay !== input.lastCheckInDay) {
    return decision(input, "nudge", "repeated_misses_caretaker_check_in",
      "Days in a row with a missed dose reached the caretaker's chosen number; one check-in per missed day.",
      { consecutiveMissedDays: input.consecutiveMissedDays, lastMissedDay: input.lastMissedDay, caretakerThreshold: caretaker.threshold }, true);
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
