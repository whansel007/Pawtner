import { DEMO_RULES } from "./config.js";
import type { AgentInput, DerivedDose, DoseEvent, DoseSchedule, HealthMetric } from "./contract.js";

export function deriveDoseStatus(
  schedule: DoseSchedule,
  events: DoseEvent[],
  now: string,
  nudgeHistory: { count: number; lastAt: string | null } = { count: 0, lastAt: null },
): DerivedDose {
  const event = events
    .filter((item) => item.scheduleId === schedule.id && Date.parse(item.occurredAt) <= Date.parse(now))
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
