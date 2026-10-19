import { DEMO_RULES } from "./config.js";
import type { AgentInput, DerivedDose, DoseEvent, DoseSchedule, HealthMetric, HeartActivities } from "./contract.js";

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

/** A saved walk as the walk heart rule sees it; `goalMinutes` null = saved before goals existed (or by an older phone). */
export interface WalkForHeart {
  startedAt: string;
  finishedAt: string;
  goalMinutes?: number | null;
}

/**
 * The walk heart rule (owner, 18 Oct: "User can stop then continue then stop. For one day it will add up"): a day's
 * walks add up. The day's walk heart is earned at the finish of the first walk where the day's walked minutes so far
 * reach that walk's own goal (stored on the walk, so a later goal change never rewrites the past). A walk with no goal
 * earns it as before, at any length. Days are grouped like the other hearts (finish date). Returns the finish times
 * that earn a heart, at most one per day. The one rule for the server's hearts and the phone's offline count.
 */
export function walkHeartTimes(walks: readonly WalkForHeart[]): string[] {
  const earned: string[] = [];
  const walkedMs = new Map<string, number>();
  const sorted = [...walks].sort((a, b) => Date.parse(a.finishedAt) - Date.parse(b.finishedAt));
  for (const walk of sorted) {
    const day = walk.finishedAt.slice(0, 10);
    if (earned.some((time) => time.slice(0, 10) === day)) continue;
    const total = (walkedMs.get(day) ?? 0) + Math.max(0, Date.parse(walk.finishedAt) - Date.parse(walk.startedAt));
    walkedMs.set(day, total);
    if (walk.goalMinutes === null || walk.goalMinutes === undefined || total >= walk.goalMinutes * 60_000) earned.push(walk.finishedAt);
  }
  return earned;
}

/** Today's (or any day's) three heart activities from that day's doses, readings and walks. */
export function heartActivities(doses: Pick<DerivedDose, "status">[], bloodPressureLogged: boolean, walked: boolean): HeartActivities {
  return { medicines: doses.length > 0 && doses.every((dose) => dose.status === "taken"), bloodPressure: bloodPressureLogged, walk: walked };
}

/** How many of the three activities are done. */
export function countActivitiesDone(activities: HeartActivities): number {
  return Object.values(activities).filter(Boolean).length;
}

/** Hearts without any history (the phone offline): the minimum plus one per activity done today, capped. */
export function computeHeart(activities: HeartActivities): number {
  return Math.min(DEMO_RULES.heartMaximum, DEMO_RULES.heartMinimum + countActivitiesDone(activities));
}

const DECAY_MS = DEMO_RULES.heartDecayHours * 3_600_000;

/**
 * A dose a stop removed (scheduled at or after the medicine's `stopped_at`), for `heartGains` only: `takenAt` if it was
 * taken before the stop, else null.
 */
export interface StoppedDose {
  scheduledAt: string;
  stoppedAt: string;
  takenAt: string | null;
}

/**
 * When each heart was earned (ISO instants, oldest first): per day, one for the medicines (the moment the last of the
 * day's doses was taken, once all are), one for the day's first measurement, one for the day's first walk. Days are
 * grouped like the streak (`scheduledAt` / `recordedAt` / walk finish date).
 * A stop never backdates a heart: a removed dose counts as done at the moment it was taken before the stop, else at the
 * stop, so a stop that leaves the day "all taken" earns its heart at the stop, and every heart before the stop stays.
 * A day left with no doses earns no medicine heart unless every removed dose had been taken before the stop.
 * (The phone's offline path never calls this; it passes no stopped doses.)
 */
export function heartGains(doses: DerivedDose[], metrics: HealthMetric[], walkFinishedAt: readonly string[], stoppedDoses: readonly StoppedDose[] = []): string[] {
  const gains: string[] = [];
  const dayKey = (scheduledAt: string) => scheduledAt.slice(0, 10);
  const dosesByDay = groupBy(doses, (dose) => dayKey(dose.scheduledAt));
  const stoppedByDay = groupBy([...stoppedDoses], (dose) => dayKey(dose.scheduledAt));
  const latest = (instants: string[]) => instants.reduce((a, b) => (Date.parse(b) > Date.parse(a) ? b : a));
  for (const day of new Set([...dosesByDay.keys(), ...stoppedByDay.keys()])) {
    const dayDoses = dosesByDay.get(day) ?? [];
    const removed = stoppedByDay.get(day) ?? [];
    if (!dayDoses.every((dose) => dose.status === "taken" && dose.eventAt)) continue;
    if (dayDoses.length === 0 && !removed.every((dose) => dose.takenAt)) continue;
    gains.push(latest([...dayDoses.map((dose) => dose.eventAt!), ...removed.map((dose) => dose.takenAt ?? dose.stoppedAt)]));
  }
  const firstPerDay = (instants: readonly string[]) => [...groupBy([...instants], (instant) => instant.slice(0, 10)).values()]
    .map((day) => day.reduce((first, instant) => (Date.parse(instant) < Date.parse(first) ? instant : first)));
  gains.push(...firstPerDay(metrics.map((metric) => metric.recordedAt)), ...firstPerDay(walkFinishedAt));
  return gains.sort((a, b) => Date.parse(a) - Date.parse(b));
}

/**
 * Hearts at `at`: from the minimum, each heart earned adds one (up to the maximum) and restarts the decay timer;
 * every `heartDecayHours` without a new heart takes one away, never below the minimum.
 */
export function heartsAt(gains: readonly string[], at: string): number {
  const atMs = Date.parse(at);
  let hearts: number = DEMO_RULES.heartMinimum;
  let timerFrom: number | null = null;
  const decayUntil = (untilMs: number) => {
    if (timerFrom === null) return;
    const drops = Math.floor((untilMs - timerFrom) / DECAY_MS);
    if (drops <= 0) return;
    hearts = Math.max(DEMO_RULES.heartMinimum, hearts - drops);
    timerFrom += drops * DECAY_MS;
  };
  for (const gain of gains) {
    const gainMs = Date.parse(gain);
    if (gainMs > atMs) break;
    decayUntil(gainMs);
    hearts = Math.min(DEMO_RULES.heartMaximum, hearts + 1);
    timerFrom = gainMs;
  }
  decayUntil(atMs);
  return hearts;
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
  /** Occurrences expanded from recurring schedules for the history window plus today (a stopped medicine's only before its stop). */
  doseOccurrences: DoseSchedule[];
  /** Occurrences a stop removed (at or after `stopped_at`); only so a stop never backdates a heart. */
  stopCutoffs?: Array<{ scheduleId: string; scheduledAt: string; stoppedAt: string }>;
  /** Stopped medicines: their earlier doses count in the history but are not actionable today (list, reminders, nudges). */
  stoppedMedicationIds?: string[];
  doseEvents: DoseEvent[];
  nudges: NudgeRecord[];
  healthMetrics: HealthMetric[];
  daysOfSupplyByMedicationId: Record<string, number | null>;
  /** Finish times that earn a day's walk heart (`walkHeartTimes`: a day's walks add up to the goal). */
  walkFinishedAt: string[];
  /** Set only when this selection follows a newly recorded event that should trigger a celebration. */
  triggeringDoseEventId?: string;
  caretaker: AgentInput["caretaker"];
  /** The senior's time zone and the doctor's future / prior visit (side-effect notes count between them). */
  timeZone?: string;
  nextDoctorVisit?: string | null;
  priorDoctorVisit?: string | null;
  /** The missed day the latest caretaker check-in was sent for (its `lastMissedDay` observation), or null. */
  lastCheckInDay: string | null;
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

/**
 * Days in a row before `today` with at least one scheduled dose not taken, counting back from yesterday; stops at a
 * fully taken day or a day with nothing scheduled. Same day grouping as `computeStreak`.
 */
export function computeMissedDays(days: StreakDay[], today: string): { count: number; lastMissedDay: string | null } {
  const byDate = new Map<string, StreakDay[]>();
  for (const item of days) byDate.set(item.date, [...(byDate.get(item.date) ?? []), item]);
  let count = 0;
  const cursor = new Date(`${today}T00:00:00.000Z`);
  cursor.setUTCDate(cursor.getUTCDate() - 1);
  const yesterday = cursor.toISOString().slice(0, 10);
  for (;;) {
    const scheduled = byDate.get(cursor.toISOString().slice(0, 10));
    if (!scheduled?.length || scheduled.every((dose) => dose.taken)) break;
    count += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return { count, lastMissedDay: count > 0 ? yesterday : null };
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

/** Every occurrence in the source with its ledger-derived status, oldest first, plus the metrics visible at `now` and the doses a stop removed. */
function deriveSelection(source: AgentSelectionSource): { derived: DerivedDose[]; metrics: HealthMetric[]; stopped: StoppedDose[] } {
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
  // Not filtered by `now`: asked about an instant before a stop, the removed dose still keeps its day incomplete until
  // the stop (a gain after `now` is ignored by heartsAt / computeHeartsTotal).
  const stopped = (source.stopCutoffs ?? [])
    .map((cutoff) => {
      const taken = (eventsByOccurrence.get(occurrenceKey(cutoff.scheduleId, cutoff.scheduledAt)) ?? [])
        .filter((event) => event.event === "taken" && Date.parse(event.occurredAt) <= Date.parse(cutoff.stoppedAt))
        .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt))[0];
      return { scheduledAt: cutoff.scheduledAt, stoppedAt: cutoff.stoppedAt, takenAt: taken?.occurredAt ?? null };
    });
  return { derived, metrics, stopped };
}

/**
 * Lifetime hearts: the sum of each day's hearts at the end of that day (`heartsAt`; today at `now`), from the first day
 * with a scheduled dose up to and including `today`. No dose history at all gives 0. Anything after `now` is ignored.
 */
export function computeHeartsTotal(doses: DerivedDose[], metrics: HealthMetric[], today: string, walkFinishedAt: readonly string[], now: string, stoppedDoses: readonly StoppedDose[] = []): number {
  const days = [...new Set(doses.map((dose) => dose.scheduledAt.slice(0, 10)))].filter((date) => date <= today).sort();
  const firstDate = days[0];
  if (!firstDate) return 0;
  const gains = heartGains(doses, metrics, walkFinishedAt, stoppedDoses).filter((gain) => Date.parse(gain) <= Date.parse(now));
  let total = 0;
  const cursor = new Date(`${firstDate}T00:00:00.000Z`);
  for (let date = firstDate; date <= today; date = cursor.toISOString().slice(0, 10)) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const endOfDay = new Date(cursor.getTime() - 1).toISOString();
    total += heartsAt(gains, date === today || Date.parse(endOfDay) > Date.parse(now) ? now : endOfDay);
  }
  return total;
}

/** Today's three heart activities for this source (same day grouping as the hearts). */
export function selectHeartActivities(source: AgentSelectionSource): HeartActivities {
  const { derived, metrics } = deriveSelection(source);
  return todayActivities(derived, metrics, source);
}

function todayActivities(derived: DerivedDose[], metrics: HealthMetric[], source: AgentSelectionSource): HeartActivities {
  const todayDoses = derived.filter((dose) => dose.scheduledAt.slice(0, 10) === source.today);
  const walkedToday = source.walkFinishedAt.some((finishedAt) => finishedAt.slice(0, 10) === source.today
    && Date.parse(finishedAt) <= Date.parse(source.now));
  return heartActivities(todayDoses, hasBloodPressureToday(metrics, source.today), walkedToday);
}

export function selectAgentInput(source: AgentSelectionSource): AgentInput {
  const { derived, metrics, stopped } = deriveSelection(source);
  const todayDoses = derived.filter((dose) => dose.scheduledAt.slice(0, 10) === source.today);
  const doseDays = derived.map((dose) => ({
    date: dose.scheduledAt.slice(0, 10),
    scheduleId: dose.id,
    taken: dose.status === "taken",
  }));
  const streak = computeStreak(doseDays, source.today);
  const missedDays = computeMissedDays(doseDays, source.today);
  const latestDoseEvent = source.triggeringDoseEventId
    ? source.doseEvents.find((event) => event.id === source.triggeringDoseEventId
      && Date.parse(event.occurredAt) <= Date.parse(source.now)) ?? null
    : null;
  return buildAgentInput({
    now: source.now,
    userId: source.userId,
    dog: {
      ...source.dog,
      heart: heartsAt(heartGains(derived, metrics, walksUntilNow(source), stopped), source.now),
      streak,
    },
    doses: actionableDoses(todayDoses, source),
    latestDoseEvent,
    healthMetrics: metrics,
    daysOfSupplyByMedicationId: source.daysOfSupplyByMedicationId,
    consecutiveMissedDays: missedDays.count,
    lastMissedDay: missedDays.lastMissedDay,
    lastCheckInDay: source.lastCheckInDay,
    caretaker: source.caretaker,
    timeZone: source.timeZone,
    nextDoctorVisit: source.nextDoctorVisit ?? null,
    priorDoctorVisit: source.priorDoctorVisit ?? null,
  });
}

/** The dog's lifetime hearts for this source, derived from the same occurrences, ledger and readings as `selectAgentInput`. */
export function selectHeartsTotal(source: AgentSelectionSource): number {
  const { derived, metrics, stopped } = deriveSelection(source);
  return computeHeartsTotal(derived, metrics, source.today, walksUntilNow(source), source.now, stopped);
}

/** Buddy's hearts at each instant (e.g. the end of each day), from the same gains as `heartsAt`; instants after `now` use `now`. */
export function selectHeartsAtInstants(source: AgentSelectionSource, instants: readonly string[]): number[] {
  const { derived, metrics, stopped } = deriveSelection(source);
  const gains = heartGains(derived, metrics, walksUntilNow(source), stopped);
  return instants.map((instant) => heartsAt(gains, Date.parse(instant) > Date.parse(source.now) ? source.now : instant));
}

/**
 * Today's doses Rose can still act on (Home, Reminders, dose-time reminders, the agent's nudges): a stopped medicine's
 * earlier doses still count in the history and the day's "all medicines taken", but are never shown or nudged again.
 */
export function actionableDoses(todayDoses: DerivedDose[], source: Pick<AgentSelectionSource, "stoppedMedicationIds">): DerivedDose[] {
  const stopped = new Set(source.stoppedMedicationIds ?? []);
  return stopped.size ? todayDoses.filter((dose) => !stopped.has(dose.medicationId)) : todayDoses;
}

function walksUntilNow(source: AgentSelectionSource): string[] {
  return source.walkFinishedAt.filter((finishedAt) => Date.parse(finishedAt) <= Date.parse(source.now));
}
