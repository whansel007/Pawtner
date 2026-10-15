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

/** Occurrence key shared by schedules, ledger events and nudges: one scheduled dose on one day. */
function occurrenceKey(scheduleId: string, scheduledFor: string): string {
  return `${scheduleId}|${Date.parse(scheduledFor)}`;
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const value = key(item);
    const group = groups.get(value);
    if (group) group.push(item);
    else groups.set(value, [item]);
  }
  return groups;
}

/** Every occurrence in the source with its ledger-derived status, oldest first, plus the metrics visible at `now`. */
function deriveSelection(source: AgentSelectionSource): { derived: DerivedDose[]; metrics: HealthMetric[] } {
  const occurrences = [...source.doseOccurrences].sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  // Index events and nudges by occurrence so long histories stay linear; deriveDoseStatus still applies its own filters.
  const eventsByOccurrence = groupBy(source.doseEvents, (event) => occurrenceKey(event.scheduleId, event.scheduledFor));
  const nudgesByOccurrence = groupBy(source.nudges, (nudge) => occurrenceKey(nudge.scheduleId, nudge.scheduledFor));
  const derived = occurrences.map((schedule) => {
    const key = occurrenceKey(schedule.id, schedule.scheduledAt);
    const nudgeHistory = (nudgesByOccurrence.get(key) ?? [])
      .filter((nudge) => Date.parse(nudge.createdAt) <= Date.parse(source.now))
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    return deriveDoseStatus(schedule, eventsByOccurrence.get(key) ?? [], source.now, {
      count: nudgeHistory.length,
      lastAt: nudgeHistory.at(-1)?.createdAt ?? null,
    });
  });
  const metrics = source.healthMetrics.filter((metric) => Date.parse(metric.recordedAt) <= Date.parse(source.now));
  return { derived, metrics };
}

/**
 * Lifetime hearts: the sum of each day's `computeHeart` from the first day with a scheduled dose up to and including `today`.
 * Days are grouped with the same date logic as `computeStreak` and today's heart (`scheduledAt` / `recordedAt` date),
 * so today's share always equals the dog's current `heart`.
 * - Days before the first scheduled dose add nothing; no dose history at all gives 0.
 * - A day inside that range with nothing due (no occurrences, or only upcoming ones later today) adds
 *   `DEMO_RULES.heartWhenNothingDue`, plus the blood-pressure bonus if logged that day: the heart the dog showed that day.
 * - Doses and readings after `today` are ignored.
 */
export function computeHeartsTotal(doses: DerivedDose[], metrics: HealthMetric[], today: string): number {
  const dosesByDate = groupBy(doses.filter((dose) => dose.scheduledAt.slice(0, 10) <= today), (dose) => dose.scheduledAt.slice(0, 10));
  const firstDate = [...dosesByDate.keys()].sort()[0];
  if (!firstDate) return 0;
  const bloodPressureDates = new Set(metrics.map((metric) => metric.recordedAt.slice(0, 10)));
  let total = 0;
  const cursor = new Date(`${firstDate}T00:00:00.000Z`);
  for (let date = firstDate; date <= today; date = cursor.toISOString().slice(0, 10)) {
    total += computeHeart(dosesByDate.get(date) ?? [], bloodPressureDates.has(date));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return total;
}

export function selectAgentInput(source: AgentSelectionSource): AgentInput {
  const { derived, metrics } = deriveSelection(source);
  const todayDoses = derived.filter((dose) => dose.scheduledAt.slice(0, 10) === source.today);
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

/** The dog's lifetime hearts for this source, derived from the same occurrences, ledger and readings as `selectAgentInput`. */
export function selectHeartsTotal(source: AgentSelectionSource): number {
  const { derived, metrics } = deriveSelection(source);
  return computeHeartsTotal(derived, metrics, source.today);
}
