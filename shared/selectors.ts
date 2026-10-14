import { DEMO_RULES } from "./config.js";
import type { AgentInput, DerivedDose, DoseEvent, DoseSchedule, HealthMetric } from "./contract.js";

export function deriveDoseStatus(
  schedule: DoseSchedule,
  events: DoseEvent[],
  now: string,
  nudgeHistory: { count: number; lastAt: string | null } = { count: 0, lastAt: null },
): DerivedDose {
  const event = events
    .filter((item) => item.scheduleId === schedule.id
      && Date.parse(item.scheduledFor) === Date.parse(schedule.scheduledAt)
      && Date.parse(item.occurredAt) <= Date.parse(now))
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))[0];
  let status: DerivedDose["status"];
  if (event?.event === "taken") status = "taken";
  else if (event?.event === "skipped") status = "skipped";
  else {
    const elapsed = Date.parse(now) - Date.parse(schedule.scheduledAt);
    if (elapsed < 0) status = "upcoming";
    else if (elapsed < DEMO_RULES.nudgeDelayMinutes * 60_000) status = "due";
    else status = "missed";
  }
  return {
    ...schedule,
    status,
    eventAt: event?.occurredAt ?? null,
    nudgeCount: nudgeHistory.count,
    lastNudgeAt: nudgeHistory.lastAt,
  };
}

export function computeHeart(doses: DerivedDose[], bloodPressureLoggedToday: boolean): number {
  const due = doses.filter((dose) => dose.status !== "upcoming");
  const base = due.length === 0
    ? DEMO_RULES.heartWhenNothingDue
    : Math.floor((due.filter((dose) => dose.status === "taken").length / due.length) * DEMO_RULES.heartScale);
  return Math.min(
    DEMO_RULES.heartMaximum,
    Math.max(DEMO_RULES.heartMinimum, base + (bloodPressureLoggedToday ? DEMO_RULES.heartBloodPressureBonus : 0)),
  );
}

export interface StreakDay {
  date: string;
  scheduleId: string;
  taken: boolean;
}

export interface NudgeRecord {
  scheduleId: string;
  scheduledFor: string;
  createdAt: string;
}

export interface AgentSelectionSource {
  now: string;
  /** Local calendar date for the user's configured timezone, formatted YYYY-MM-DD. */
  today: string;
  userId: string;
  dog: { id: string; name: string };
  /** Occurrences expanded from active recurring schedules for the history window plus today. */
  doseOccurrences: DoseSchedule[];
  doseEvents: DoseEvent[];
  nudges: NudgeRecord[];
  healthMetrics: HealthMetric[];
  daysOfSupplyByMedicationId: Record<string, number | null>;
  /** Set only when this selection follows a newly recorded event that should trigger a celebration. */
  triggeringDoseEventId?: string;
  caretaker: AgentInput["caretaker"];
}

export function computeStreak(days: StreakDay[], today: string): number {
  const byDate = new Map<string, StreakDay[]>();
  for (const item of days) byDate.set(item.date, [...(byDate.get(item.date) ?? []), item]);
  let streak = 0;
  const cursor = new Date(`${today}T00:00:00.000Z`);
  cursor.setUTCDate(cursor.getUTCDate() - 1);
  for (;;) {
    const date = cursor.toISOString().slice(0, 10);
    const scheduled = byDate.get(date);
    if (!scheduled?.length || scheduled.some((dose) => !dose.taken)) return streak;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
}

export function hasBloodPressureToday(metrics: HealthMetric[], today: string): boolean {
  return metrics.some((metric) => metric.recordedAt.slice(0, 10) === today);
}

export function buildAgentInput(input: AgentInput): AgentInput {
  if (input.caretaker && input.caretaker.threshold < DEMO_RULES.caretakerMinimumThreshold) {
    throw new RangeError(`Caretaker threshold must be at least ${DEMO_RULES.caretakerMinimumThreshold}.`);
  }
  return input;
}

export function selectAgentInput(source: AgentSelectionSource): AgentInput {
  const occurrences = [...source.doseOccurrences].sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  const derived = occurrences.map((schedule) => {
    const nudgeHistory = source.nudges.filter((nudge) => nudge.scheduleId === schedule.id
      && Date.parse(nudge.scheduledFor) === Date.parse(schedule.scheduledAt)
      && Date.parse(nudge.createdAt) <= Date.parse(source.now))
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    return deriveDoseStatus(schedule, source.doseEvents, source.now, {
      count: nudgeHistory.length,
      lastAt: nudgeHistory.at(-1)?.createdAt ?? null,
    });
  });
  const todayDoses = derived.filter((dose) => dose.scheduledAt.slice(0, 10) === source.today);
  const metrics = source.healthMetrics.filter((metric) => Date.parse(metric.recordedAt) <= Date.parse(source.now));
  const streak = computeStreak(derived.map((dose) => ({
    date: dose.scheduledAt.slice(0, 10),
    scheduleId: dose.id,
    taken: dose.status === "taken",
  })), source.today);
  const completedOrMissed = derived.filter((dose) => Date.parse(dose.scheduledAt) <= Date.parse(source.now));
  let consecutiveMissedDoses = 0;
  for (const dose of [...completedOrMissed].reverse()) {
    if (dose.status !== "missed") break;
    consecutiveMissedDoses += 1;
  }
  const latestDoseEvent = source.triggeringDoseEventId
    ? source.doseEvents.find((event) => event.id === source.triggeringDoseEventId
      && Date.parse(event.occurredAt) <= Date.parse(source.now)) ?? null
    : null;
  return buildAgentInput({
    now: source.now,
    userId: source.userId,
    dog: {
      ...source.dog,
      heart: computeHeart(todayDoses, hasBloodPressureToday(metrics, source.today)),
      streak,
    },
    doses: todayDoses,
    latestDoseEvent,
    healthMetrics: metrics,
    daysOfSupplyByMedicationId: source.daysOfSupplyByMedicationId,
    consecutiveMissedDoses,
    caretaker: source.caretaker,
  });
}
