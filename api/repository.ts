import { randomUUID } from "node:crypto";
import type { Pool, PoolClient, QueryResultRow } from "pg";
import { DEMO_RULES } from "../shared/config.js";
import { decide } from "../shared/rules.js";
import { selectAgentInput, type AgentSelectionSource } from "../shared/selectors.js";
import { applyModelWording } from "../shared/wording.js";
import type {
  AgentDecision,
  AgentInput,
  CaretakerSummaryResponse,
  DoseEvent,
  DoseEventRequest,
  DoseEventResponse,
  EscalationSettingsRequest,
  EscalationSettingsResponse,
  HealthMetric,
  HealthMetricRequest,
  HealthMetricResponse,
  TodayResponse,
  WalkSessionRequest,
  WalkSessionResponse,
} from "../shared/contract.js";

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function localDate(now: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(now));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDate(date: string, amount: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function mapDecision(row: QueryResultRow | undefined): AgentDecision | null {
  if (!row) return null;
  return {
    id: row.id,
    decision: row.decision,
    ruleId: row.rule_id,
    mood: row.mood,
    observations: row.observations,
    reasoning: row.reasoning,
    wording: row.wording,
    wordingSource: row.wording_source,
    caretakerPing: row.caretaker_ping,
    refused: row.refused,
    ...(row.refusal_kind ? { refusalKind: row.refusal_kind } : {}),
    ...(row.schedule_id ? { scheduleId: row.schedule_id, scheduledFor: iso(row.scheduled_for) } : {}),
    createdAt: iso(row.created_at),
  };
}

function mapMetric(row: QueryResultRow): HealthMetric {
  return {
    id: row.id,
    kind: "blood_pressure",
    systolic: row.systolic,
    diastolic: row.diastolic,
    note: row.note,
    recordedAt: iso(row.recorded_at),
  };
}

function mapEvent(row: QueryResultRow): DoseEvent {
  return {
    id: row.id,
    scheduleId: row.schedule_id,
    scheduledFor: iso(row.scheduled_for),
    event: row.event,
    occurredAt: iso(row.occurred_at),
    proofPhotoUrl: row.proof_photo_url,
  };
}

export class PawtnerRepository {
  constructor(private readonly pool: Pool) {}

  private async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async getDefaultUserId(client: PoolClient | Pool = this.pool): Promise<string> {
    const result = await client.query("SELECT id::text FROM users ORDER BY created_at, id LIMIT 1");
    if (!result.rows[0]) throw new ApiError(503, "No demo user is seeded. Run db:seed first.");
    return result.rows[0].id;
  }

  private async loadInput(
    client: PoolClient | Pool,
    userId: string,
    now: string,
    triggeringDoseEventId?: string,
  ): Promise<AgentInput> {
    const personResult = await client.query(
      `SELECT u.timezone, d.id::text AS dog_id, d.name AS dog_name
       FROM users u JOIN dogs d ON d.user_id = u.id WHERE u.id = $1`,
      [userId],
    );
    const person = personResult.rows[0];
    if (!person) throw new ApiError(404, "Demo user or dog not found.");
    const today = localDate(now, person.timezone);
    const scheduleResult = await client.query(
      `SELECT ms.id::text AS id, m.id::text AS medication_id, m.name AS medication_name,
              m.strength, ((days.local_day + ms.scheduled_time) AT TIME ZONE u.timezone) AS scheduled_at
       FROM med_schedules ms
       JOIN medications m ON m.id = ms.medication_id
       JOIN users u ON u.id = m.user_id
       CROSS JOIN LATERAL generate_series(
         GREATEST(ms.starts_on, ($2::date - 365))::timestamp,
         LEAST(COALESCE(ms.ends_on, $2::date), $2::date)::timestamp,
         interval '1 day'
       ) AS days(local_day)
       WHERE u.id = $1 AND m.active = true
         AND ms.starts_on <= $2::date AND (ms.ends_on IS NULL OR ms.ends_on >= ($2::date - 365))
       ORDER BY scheduled_at, ms.id`,
      [userId, today],
    );
    const schedules = scheduleResult.rows.map((row) => ({
      id: row.id,
      medicationId: row.medication_id,
      medicationName: row.medication_name,
      strength: row.strength,
      scheduledAt: iso(row.scheduled_at),
    }));
    const earliest = schedules[0]?.scheduledAt ?? `${shiftDate(today, -365)}T00:00:00.000Z`;
    const eventsResult = await client.query(
      `SELECT de.id::text AS id, de.schedule_id::text AS schedule_id, de.scheduled_for,
              de.event, de.occurred_at, de.proof_photo_url
       FROM dose_events de
       JOIN med_schedules ms ON ms.id = de.schedule_id
       JOIN medications m ON m.id = ms.medication_id
       WHERE m.user_id = $1 AND de.scheduled_for >= $2::timestamptz
         AND de.occurred_at <= $3::timestamptz
       ORDER BY de.occurred_at`,
      [userId, earliest, now],
    );
    const events = eventsResult.rows.map(mapEvent);
    const nudgesResult = await client.query(
      `SELECT schedule_id::text AS schedule_id, scheduled_for, created_at
       FROM agent_decisions
       WHERE user_id = $1 AND decision = 'nudge' AND schedule_id IS NOT NULL
         AND created_at <= $2::timestamptz AND scheduled_for >= $3::timestamptz
       ORDER BY created_at`,
      [userId, now, earliest],
    );
    const metricsResult = await client.query(
      `SELECT id::text AS id, systolic, diastolic, note, recorded_at
       FROM health_metrics WHERE user_id = $1 AND recorded_at <= $2::timestamptz
       ORDER BY recorded_at DESC`,
      [userId, now],
    );
    const medsResult = await client.query(
      "SELECT id::text, days_of_supply FROM medications WHERE user_id = $1 AND active = true",
      [userId],
    );
    const caregiverResult = await client.query(
      `SELECT opted_in, threshold FROM user_caregivers WHERE user_id = $1 ORDER BY caregiver_id LIMIT 1`,
      [userId],
    );
    const nudgeRows = nudgesResult.rows.map((row) => ({
      scheduleId: row.schedule_id,
      scheduledFor: iso(row.scheduled_for),
      createdAt: iso(row.created_at),
    }));
    const source: AgentSelectionSource = {
      now,
      today,
      userId,
      dog: { id: person.dog_id, name: person.dog_name },
      doseOccurrences: schedules,
      doseEvents: events,
      nudges: nudgeRows,
      healthMetrics: metricsResult.rows.map((row) => ({ ...mapMetric(row), kind: "blood_pressure" as const })),
      daysOfSupplyByMedicationId: Object.fromEntries(medsResult.rows.map((row) => [row.id, row.days_of_supply] as const)),
      caretaker: caregiverResult.rows[0]
        ? { optedIn: caregiverResult.rows[0].opted_in, threshold: caregiverResult.rows[0].threshold }
        : null,
      ...(triggeringDoseEventId ? { triggeringDoseEventId } : {}),
    };
    return selectAgentInput(source);
  }

  private async latestDecision(client: PoolClient | Pool, userId: string): Promise<AgentDecision | null> {
    const result = await client.query(
      "SELECT * FROM agent_decisions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
      [userId],
    );
    return mapDecision(result.rows[0]);
  }

  private async today(client: PoolClient | Pool, userId: string, now: string, triggerEventId?: string): Promise<TodayResponse> {
    const input = await this.loadInput(client, userId, now, triggerEventId);
    const userResult = await client.query("SELECT id::text, name FROM users WHERE id = $1", [userId]);
    const dogResult = await client.query("SELECT id::text, name, mood FROM dogs WHERE user_id = $1", [userId]);
    const timezoneResult = await client.query("SELECT timezone FROM users WHERE id = $1", [userId]);
    const today = localDate(now, timezoneResult.rows[0].timezone);
    const healthMetrics = input.healthMetrics.filter((metric) => localDate(metric.recordedAt, timezoneResult.rows[0].timezone) === today);
    const latestDecision = await this.latestDecision(client, userId);
    const dog = dogResult.rows[0];
    return {
      user: userResult.rows[0],
      dog: { id: dog.id, name: dog.name, mood: dog.mood, heart: input.dog.heart, streak: input.dog.streak },
      doses: input.doses,
      healthMetrics,
      bloodPressureLoggedToday: healthMetrics.length > 0,
      latestDecision,
    };
  }

  private async saveDecision(client: PoolClient, userId: string, decision: AgentDecision): Promise<AgentDecision> {
    const persisted = { ...decision, id: randomUUID() };
    await client.query(
      `INSERT INTO agent_decisions
         (id, user_id, schedule_id, decision, rule_id, scheduled_for, mood, observations,
          reasoning, wording, wording_source, caretaker_ping, refused, refusal_kind, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14, $15)`,
      [persisted.id, userId, persisted.scheduleId ?? null, persisted.decision, persisted.ruleId,
        persisted.scheduledFor ?? null, persisted.mood, JSON.stringify(persisted.observations), persisted.reasoning,
        persisted.wording, persisted.wordingSource, persisted.caretakerPing, persisted.refused,
        persisted.refusalKind ?? null, persisted.createdAt],
    );
    return persisted;
  }

  private async decideAndPersist(
    client: PoolClient,
    userId: string,
    now: string,
    triggerEventId?: string,
    extra?: { walkFinished?: boolean },
  ): Promise<{ input: AgentInput; decision: AgentDecision }> {
    const input = await this.loadInput(client, userId, now, triggerEventId);
    const decisionInput = { ...input, ...extra };
    const rawDecision = decide(decisionInput);
    const decisionWithWording = await applyModelWording(rawDecision, {
      apiKey: process.env.LLM_API_KEY,
      timeoutMs: 1_500,
    });
    const saved = await this.saveDecision(client, userId, decisionWithWording);
    await client.query(
      "UPDATE dogs SET heart = $2, streak = $3, mood = $4 WHERE user_id = $1",
      [userId, input.dog.heart, input.dog.streak, saved.mood],
    );
    return { input, decision: saved };
  }

  async getToday(now = new Date().toISOString()): Promise<TodayResponse> {
    const userId = await this.getDefaultUserId();
    return this.today(this.pool, userId, now);
  }

  async recordDoseEvent(request: DoseEventRequest): Promise<DoseEventResponse> {
    return this.transaction(async (client) => {
      const userId = await this.getDefaultUserId(client);
      const validSchedule = await client.query(
        `SELECT ms.id FROM med_schedules ms
         JOIN medications m ON m.id = ms.medication_id JOIN users u ON u.id = m.user_id
         WHERE ms.id = $1 AND u.id = $2
           AND (ms.starts_on <= ($3::timestamptz AT TIME ZONE u.timezone)::date)
           AND (ms.ends_on IS NULL OR ms.ends_on >= ($3::timestamptz AT TIME ZONE u.timezone)::date)
           AND ms.scheduled_time = ($3::timestamptz AT TIME ZONE u.timezone)::time`,
        [request.scheduleId, userId, request.scheduledFor],
      );
      if (!validSchedule.rowCount) throw new ApiError(404, "Dose schedule occurrence not found.");
      const id = randomUUID();
      const inserted = await client.query(
        `INSERT INTO dose_events (id, schedule_id, scheduled_for, event, occurred_at, proof_photo_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id::text AS id, schedule_id::text AS schedule_id, scheduled_for, event, occurred_at, proof_photo_url`,
        [id, request.scheduleId, request.scheduledFor, request.event, request.occurredAt, request.proofPhotoUrl ?? null],
      );
      const { decision } = await this.decideAndPersist(client, userId, request.occurredAt, id);
      return {
        event: mapEvent(inserted.rows[0]),
        today: await this.today(client, userId, request.occurredAt),
        decision,
      };
    });
  }

  async recordHealthMetric(request: HealthMetricRequest): Promise<HealthMetricResponse> {
    return this.transaction(async (client) => {
      const userId = await this.getDefaultUserId(client);
      const id = randomUUID();
      const inserted = await client.query(
        `INSERT INTO health_metrics (id, user_id, kind, systolic, diastolic, note, recorded_at)
         VALUES ($1, $2, 'blood_pressure', $3, $4, $5, $6)
         RETURNING id::text AS id, systolic, diastolic, note, recorded_at`,
        [id, userId, request.systolic, request.diastolic, request.note ?? null, request.recordedAt],
      );
      const { decision } = await this.decideAndPersist(client, userId, request.recordedAt);
      return { metric: mapMetric(inserted.rows[0]), decision };
    });
  }

  async decideNow(userId: string, now: string): Promise<AgentDecision> {
    return this.transaction(async (client) => {
      const exists = await client.query("SELECT 1 FROM users WHERE id = $1", [userId]);
      if (!exists.rowCount) throw new ApiError(404, "User not found.");
      return (await this.decideAndPersist(client, userId, now)).decision;
    });
  }

  async getCaretakerSummary(now = new Date().toISOString()): Promise<CaretakerSummaryResponse> {
    const userId = await this.getDefaultUserId();
    const identity = await this.pool.query(
      `SELECT u.id::text AS user_id, u.name AS senior_name, u.timezone,
              d.id::text AS dog_id, d.name AS dog_name, d.mood,
              c.id::text AS caregiver_id, c.name AS caregiver_name
       FROM users u JOIN dogs d ON d.user_id = u.id
       LEFT JOIN user_caregivers uc ON uc.user_id = u.id
       LEFT JOIN caregivers c ON c.id = uc.caregiver_id
       WHERE u.id = $1 LIMIT 1`,
      [userId],
    );
    const person = identity.rows[0];
    const today = localDate(now, person.timezone);
    const start = shiftDate(today, -6);
    const scheduleStats = await this.pool.query(
      `WITH calendar AS (
         SELECT generate_series($2::date::timestamp, $3::date::timestamp, interval '1 day') AS local_day
       ), occurrences AS (
         SELECT calendar.local_day::date AS local_day, ms.id AS schedule_id,
                ((calendar.local_day + ms.scheduled_time) AT TIME ZONE u.timezone) AS scheduled_for
         FROM calendar CROSS JOIN users u
         JOIN medications m ON m.user_id = u.id AND m.active = true
         JOIN med_schedules ms ON ms.medication_id = m.id
         WHERE u.id = $1 AND ms.starts_on <= calendar.local_day::date
           AND (ms.ends_on IS NULL OR ms.ends_on >= calendar.local_day::date)
       ), statuses AS (
         SELECT o.local_day, o.schedule_id, event.event
         FROM occurrences o
         LEFT JOIN LATERAL (
           SELECT de.event FROM dose_events de
           WHERE de.schedule_id = o.schedule_id AND de.scheduled_for = o.scheduled_for
           ORDER BY de.occurred_at DESC LIMIT 1
         ) event ON true
       ), daily AS (
         SELECT local_day, count(*) AS total,
                count(*) FILTER (WHERE event = 'taken') AS taken
         FROM statuses GROUP BY local_day
       )
       SELECT COALESCE(sum(total), 0)::int AS doses_due,
              COALESCE(sum(taken), 0)::int AS doses_taken,
              count(*) FILTER (WHERE total = taken AND total > 0)::int AS completed_days
       FROM daily`,
      [userId, start, today],
    );
    const walkStats = await this.pool.query(
      `SELECT count(*)::int AS walk_count, COALESCE(sum(distance_meters), 0)::int AS distance_meters,
              max(finished_at) AS latest_walk
       FROM walk_sessions WHERE user_id = $1 AND started_at >= ($2::date::timestamp AT TIME ZONE $4)
         AND started_at < (($3::date + 1)::timestamp AT TIME ZONE $4)`,
      [userId, start, today, person.timezone],
    );
    const latestMetricResult = await this.pool.query(
      "SELECT id::text AS id, systolic, diastolic, note, recorded_at FROM health_metrics WHERE user_id = $1 ORDER BY recorded_at DESC LIMIT 1",
      [userId],
    );
    const momentsResult = await this.pool.query(
      `SELECT id::text AS id, decision, caretaker_ping, created_at
       FROM agent_decisions WHERE user_id = $1 AND created_at >= ($2::date::timestamp AT TIME ZONE $4)
         AND created_at < (($3::date + 1)::timestamp AT TIME ZONE $4)
         AND (decision = 'celebrate' OR caretaker_ping = true)
       ORDER BY created_at DESC LIMIT 20`,
      [userId, start, today, person.timezone],
    );
    const questionsResult = await this.pool.query(
      `SELECT note, recorded_at FROM health_metrics
       WHERE user_id = $1 AND note IS NOT NULL AND note <> ''
         AND recorded_at >= ($2::date::timestamp AT TIME ZONE $4)
         AND recorded_at < (($3::date + 1)::timestamp AT TIME ZONE $4)
       ORDER BY recorded_at DESC LIMIT 10`,
      [userId, start, today, person.timezone],
    );
    const latestDecision = await this.latestDecision(this.pool, userId);
    const input = await this.loadInput(this.pool, userId, now);
    const stats = scheduleStats.rows[0];
    const walks = walkStats.rows[0];
    const denominator = stats.doses_due;
    const careScore = denominator === 0 ? 0 : Math.floor((stats.doses_taken / denominator) * 100);
    const latestActivity = [walks.latest_walk, latestDecision?.createdAt]
      .filter(Boolean).map((value) => new Date(value as string | Date)).sort((a, b) => b.getTime() - a.getTime())[0];
    return {
      period: { start, end: today },
      senior: { id: person.user_id, name: person.senior_name },
      caregiver: person.caregiver_id ? { id: person.caregiver_id, name: person.caregiver_name } : null,
      dog: { id: person.dog_id, name: person.dog_name, mood: person.mood, heart: input.dog.heart, streak: input.dog.streak },
      careScore,
      caringDays: Math.max(stats.completed_days, 0),
      dosesTaken: stats.doses_taken,
      dosesDue: stats.doses_due,
      walkCount: walks.walk_count,
      walkDistanceMeters: walks.distance_meters,
      latestActivityAt: latestActivity ? latestActivity.toISOString() : null,
      latestBloodPressure: latestMetricResult.rows[0] ? mapMetric(latestMetricResult.rows[0]) : null,
      caringMoments: momentsResult.rows.map((row) => ({
        id: row.id,
        kind: row.caretaker_ping ? "check_in" as const : "celebration" as const,
        message: row.caretaker_ping ? "A gentle check-in may help today." : "A caring moment from the routine.",
        occurredAt: iso(row.created_at),
      })),
      doctorQuestions: questionsResult.rows.map((row) => ({
        note: `Ask a healthcare professional about: ${row.note}`,
        occurredAt: iso(row.recorded_at),
      })),
    };
  }

  async getEscalationSettings(): Promise<EscalationSettingsResponse> {
    const userId = await this.getDefaultUserId();
    const result = await this.pool.query(
      "SELECT opted_in, threshold FROM user_caregivers WHERE user_id = $1 ORDER BY caregiver_id LIMIT 1",
      [userId],
    );
    if (!result.rows[0]) return { optedIn: false, threshold: DEMO_RULES.defaultCaretakerThreshold };
    return { optedIn: result.rows[0].opted_in, threshold: result.rows[0].threshold };
  }

  async updateEscalationSettings(request: EscalationSettingsRequest): Promise<EscalationSettingsResponse> {
    if (request.threshold < DEMO_RULES.caretakerMinimumThreshold) {
      throw new ApiError(400, `Caretaker threshold must be at least ${DEMO_RULES.caretakerMinimumThreshold}.`);
    }
    return this.transaction(async (client) => {
      const userId = await this.getDefaultUserId(client);
      await client.query(
        `UPDATE user_caregivers SET opted_in = $2, threshold = $3
         WHERE user_id = $1`,
        [userId, request.optedIn, request.threshold],
      );
      const result = await client.query(
        "SELECT opted_in, threshold FROM user_caregivers WHERE user_id = $1 ORDER BY caregiver_id LIMIT 1",
        [userId],
      );
      if (!result.rows[0]) throw new ApiError(404, "Caretaker settings not found.");
      return { optedIn: result.rows[0].opted_in, threshold: result.rows[0].threshold };
    });
  }

  async recordWalkSession(request: WalkSessionRequest): Promise<WalkSessionResponse> {
    return this.transaction(async (client) => {
      const userId = await this.getDefaultUserId(client);
      const id = randomUUID();
      const result = await client.query(
        `INSERT INTO walk_sessions (id, user_id, started_at, finished_at, distance_meters, fast_stretch_occurred)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id::text, started_at, finished_at, distance_meters, fast_stretch_occurred`,
        [id, userId, request.startedAt, request.finishedAt, request.distanceMeters, request.fastStretchOccurred],
      );
      const { decision } = await this.decideAndPersist(client, userId, request.finishedAt, undefined, { walkFinished: true });
      const row = result.rows[0];
      return {
        id: row.id,
        startedAt: iso(row.started_at),
        finishedAt: iso(row.finished_at),
        distanceMeters: row.distance_meters,
        fastStretchOccurred: row.fast_stretch_occurred,
        decision,
        souvenirId: null,
      };
    });
  }
}
