import { randomUUID } from "node:crypto";
import type { Pool, PoolClient, QueryResultRow } from "pg";
import { DEMO_RULES } from "../shared/config.js";
import { decide, selectDogMood, firstReadingOf } from "../shared/rules.js";
import { selectAgentInput, selectHeartsTotal, type AgentSelectionSource } from "../shared/selectors.js";
import { applyModelWording } from "../shared/wording.js";
import { SOUVENIR_TIERS, unlockedSouvenirs, nextSouvenir } from "../shared/souvenirs.js";
import { FALLBACK_EXPLANATION, HEALTHHUB_MEDICATIONS_URL, NDF_URL, validateRephrase } from "../shared/medlineplus.js";
import type {
  AgentDecision,
  AgentInput,
  CaretakerSummaryResponse,
  CreateMedicationRequest,
  CreateMedicationResponse,
  CreateScheduleRequest,
  CreateScheduleResponse,
  DoseEvent,
  DoseEventRequest,
  DoseEventResponse,
  EscalationSettingsRequest,
  EscalationSettingsResponse,
  HealthMetric,
  HealthMetricRequest,
  HealthMetricResponse,
  MedicationDetail,
  MedicationListResponse,
  MedicineExplanationResponse,
  MilestonesResponse,
  PillReferenceImageResponse,
  PillReferenceRequest,
  PillReferenceResponse,
  PillVerifyRequest,
  PillVerifyResponse,
  SouvenirResponse,
  TodayResponse,
  TreatResponse,
  WalkSessionRequest,
  WalkSessionResponse,
} from "../shared/contract.js";

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export interface RegisteredProduct {
  id: string;
  brandName: string;
  genericName: string | null;
  strength: string | null;
  dosageForm: string | null;
  routeOfAdministration: string | null;
  forensicClassification: string | null;
  activeIngredients: string | null;
  sourceAttribution: string;
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

function mapMedication(row: QueryResultRow): MedicationDetail {
  return {
    id: row.id,
    name: row.name,
    strength: row.strength,
    dosageForm: row.dosage_form ?? null,
    routeOfAdministration: row.route_of_administration ?? null,
    activeIngredients: row.active_ingredients ?? null,
    genericName: row.generic_name ?? null,
    prescribedFor: row.prescribed_for ?? null,
    daysOfSupply: row.days_of_supply ?? null,
    photoUrl: row.photo_url ?? null,
    active: row.active,
    pillReferenceSet: row.pill_reference_set ?? false,
  };
}

export class PawtnerRepository {
  constructor(private readonly pool: Pool) {}

  async searchRegisteredProducts(query: string): Promise<{ query: string; products: RegisteredProduct[] }> {
    const term = query.trim().replace(/[!%_]/g, (character) => `!${character}`);
    if (term.length < 2) return { query: query.trim(), products: [] };
    const result = await this.pool.query(
      `SELECT id::text AS id, brand_name, generic_name, strength, dosage_form,
              route_of_administration, forensic_classification, active_ingredients, source_attribution
       FROM sg_registered_products
       WHERE brand_name ILIKE $1 ESCAPE '!'
          OR COALESCE(generic_name, '') ILIKE $1 ESCAPE '!'
          OR COALESCE(active_ingredients, '') ILIKE $1 ESCAPE '!'
       ORDER BY CASE WHEN lower(brand_name) = lower($2)
                        OR lower(generic_name) = lower($2)
                        OR lower(active_ingredients) = lower($2) THEN 0
                     WHEN brand_name ILIKE $3 ESCAPE '!'
                       OR COALESCE(generic_name, '') ILIKE $3 ESCAPE '!'
                       OR COALESCE(active_ingredients, '') ILIKE $3 ESCAPE '!' THEN 1
                     ELSE 2 END,
                brand_name
       LIMIT 20`,
      [`%${term}%`, query.trim(), `${term}%`],
    );
    return {
      query: query.trim(),
      products: result.rows.map((row) => ({
        id: row.id,
        brandName: row.brand_name,
        genericName: row.generic_name,
        strength: row.strength,
        dosageForm: row.dosage_form,
        routeOfAdministration: row.route_of_administration,
        forensicClassification: row.forensic_classification,
        activeIngredients: row.active_ingredients,
        sourceAttribution: row.source_attribution,
      })),
    };
  }

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
    return selectAgentInput(await this.loadSource(client, userId, now, triggeringDoseEventId));
  }

  /** Today's agent input plus the dog's lifetime hearts, both from one read of the full dose history. */
  private async loadDogState(client: PoolClient | Pool, userId: string, now: string, triggeringDoseEventId?: string)
    : Promise<{ input: AgentInput; heartsTotal: number }> {
    const source = await this.loadSource(client, userId, now, triggeringDoseEventId);
    return { input: selectAgentInput(source), heartsTotal: selectHeartsTotal(source) };
  }

  /** Reads everything the selectors need: every occurrence since each active schedule started (no history cap), ledger, nudges, readings. */
  private async loadSource(
    client: PoolClient | Pool,
    userId: string,
    now: string,
    triggeringDoseEventId?: string,
  ): Promise<AgentSelectionSource> {
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
         ms.starts_on::timestamp,
         LEAST(COALESCE(ms.ends_on, $2::date), $2::date)::timestamp,
         interval '1 day'
       ) AS days(local_day)
       WHERE u.id = $1 AND m.active = true AND ms.starts_on <= $2::date
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
    return {
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
  }

  private async latestDecision(client: PoolClient | Pool, userId: string, now?: string): Promise<AgentDecision | null> {
    const result = await client.query(
      `SELECT * FROM agent_decisions WHERE user_id = $1 AND ($2::timestamptz IS NULL OR created_at <= $2::timestamptz)
       ORDER BY created_at DESC LIMIT 1`,
      [userId, now ?? null],
    );
    return mapDecision(result.rows[0]);
  }

  private async today(client: PoolClient | Pool, userId: string, now: string, triggerEventId?: string): Promise<TodayResponse> {
    const { input, heartsTotal } = await this.loadDogState(client, userId, now, triggerEventId);
    const userResult = await client.query("SELECT id::text, name FROM users WHERE id = $1", [userId]);
    const dogResult = await client.query("SELECT id::text, name, mood FROM dogs WHERE user_id = $1", [userId]);
    const timezoneResult = await client.query("SELECT timezone FROM users WHERE id = $1", [userId]);
    const today = localDate(now, timezoneResult.rows[0].timezone);
    const healthMetrics = input.healthMetrics.filter((metric) => localDate(metric.recordedAt, timezoneResult.rows[0].timezone) === today);
    const latestDecision = await this.latestDecision(client, userId, now);
    const dog = dogResult.rows[0];
    return {
      user: userResult.rows[0],
      dog: { id: dog.id, name: dog.name, mood: selectDogMood(input.dog.heart, latestDecision, now), heart: input.dog.heart, streak: input.dog.streak, heartsTotal },
      doses: input.doses,
      healthMetrics,
      bloodPressureLoggedToday: healthMetrics.length > 0,
      latestDecision,
      firstBloodPressure: firstReadingOf(input.healthMetrics),
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

  /**
   * Demo only (Settings > For demo only > Reset to morning). DATA DELETE, scoped to the demo user: removes their dose
   * taps (by scheduled time), readings and agent decisions from the start of `now`'s local day on, including rows a
   * demo clock dated later. Earlier days, the seed readings, walks and treats stay. Then the agent decides once at `now`,
   * so Buddy's mood comes from the fresh state rather than an older decision.
   */
  async resetDemoDay(now: string): Promise<TodayResponse> {
    return this.transaction(async (client) => {
      const userId = await this.getDefaultUserId(client);
      const dayStart = "((($2::timestamptz AT TIME ZONE u.timezone)::date)::timestamp AT TIME ZONE u.timezone)";
      await client.query(
        `DELETE FROM dose_events de USING med_schedules ms, medications m, users u
         WHERE ms.id = de.schedule_id AND m.id = ms.medication_id AND u.id = m.user_id
           AND u.id = $1 AND de.scheduled_for >= ${dayStart}`,
        [userId, now],
      );
      await client.query(
        `DELETE FROM health_metrics hm USING users u
         WHERE u.id = hm.user_id AND u.id = $1 AND hm.recorded_at >= ${dayStart}`,
        [userId, now],
      );
      await client.query(
        `DELETE FROM agent_decisions ad USING users u
         WHERE u.id = ad.user_id AND u.id = $1 AND ad.created_at >= ${dayStart}`,
        [userId, now],
      );
      await this.decideAndPersist(client, userId, now);
      return this.today(client, userId, now);
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
    const latestDecision = await this.latestDecision(this.pool, userId, now);
    const { input, heartsTotal } = await this.loadDogState(this.pool, userId, now);
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
      dog: { id: person.dog_id, name: person.dog_name, mood: selectDogMood(input.dog.heart, latestDecision, now), heart: input.dog.heart, streak: input.dog.streak, heartsTotal },
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

      // T2-09: unlock souvenirs based on cumulative walk distance
      const cumulativeResult = await client.query(
        "SELECT COALESCE(sum(distance_meters), 0)::int AS total FROM walk_sessions WHERE user_id = $1",
        [userId],
      );
      const cumulative = cumulativeResult.rows[0].total;
      const shouldUnlock = unlockedSouvenirs(cumulative);
      let souvenirId: string | null = null;
      if (shouldUnlock.length > 0) {
        // Insert any newly unlocked souvenirs
        for (const key of shouldUnlock) {
          const existing = await client.query(
            "SELECT 1 FROM souvenirs WHERE user_id = $1 AND souvenir_key = $2",
            [userId, key],
          );
          if (!existing.rowCount) {
            const souvenirIdRow = randomUUID();
            await client.query(
              "INSERT INTO souvenirs (id, user_id, souvenir_key, unlocked_at) VALUES ($1, $2, $3, $4)",
              [souvenirIdRow, userId, key, request.finishedAt],
            );
            // Return the last newly unlocked one
            souvenirId = souvenirIdRow;
          }
        }
      }

      return {
        id: row.id,
        startedAt: iso(row.started_at),
        finishedAt: iso(row.finished_at),
        distanceMeters: row.distance_meters,
        fastStretchOccurred: row.fast_stretch_occurred,
        decision,
        souvenirId,
      };
    });
  }

  // ── T2-02 / T2-06: Medication CRUD ──

  async listMedications(): Promise<MedicationListResponse> {
    const userId = await this.getDefaultUserId();
    const result = await this.pool.query(
      `SELECT id::text, name, strength, dosage_form, route_of_administration,
              active_ingredients, generic_name, prescribed_for, days_of_supply,
              photo_url, active,
              (pill_reference_description IS NOT NULL) AS pill_reference_set
       FROM medications WHERE user_id = $1 ORDER BY created_at`,
      [userId],
    );
    return { medications: result.rows.map(mapMedication) };
  }

  async createMedication(request: CreateMedicationRequest): Promise<CreateMedicationResponse> {
    return this.transaction(async (client) => {
      const userId = await this.getDefaultUserId(client);
      if (!request.name?.trim()) throw new ApiError(400, "Medicine name is required.");
      if (request.name.length > 200) throw new ApiError(400, "Medicine name must be at most 200 characters.");
      const id = randomUUID();
      const result = await client.query(
        `INSERT INTO medications
           (id, user_id, name, strength, dosage_form, route_of_administration,
            active_ingredients, generic_name, prescribed_for, days_of_supply, photo_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id::text, name, strength, dosage_form, route_of_administration,
                   active_ingredients, generic_name, prescribed_for, days_of_supply,
                   photo_url, active`,
        [
          id, userId, request.name.trim(),
          request.strength?.trim() || null,
          request.dosageForm?.trim() || null,
          request.routeOfAdministration?.trim() || null,
          request.activeIngredients?.trim() || null,
          request.genericName?.trim() || null,
          request.prescribedFor?.trim() || null,
          Number.isInteger(request.daysOfSupply) ? request.daysOfSupply : null,
          request.photoUrl?.trim() || null,
        ],
      );
      return { medication: mapMedication(result.rows[0]) };
    });
  }

  async updateMedication(medicationId: string, request: Partial<CreateMedicationRequest>): Promise<{ medication: MedicationDetail }> {
    return this.transaction(async (client) => {
      const userId = await this.getDefaultUserId(client);
      const existing = await client.query(
        "SELECT 1 FROM medications WHERE id = $1 AND user_id = $2",
        [medicationId, userId],
      );
      if (!existing.rowCount) throw new ApiError(404, "Medication not found.");
      const fields: string[] = [];
      const params: unknown[] = [];
      const fieldMap: Record<string, string> = {
        name: "name",
        strength: "strength",
        dosageForm: "dosage_form",
        routeOfAdministration: "route_of_administration",
        activeIngredients: "active_ingredients",
        genericName: "generic_name",
        prescribedFor: "prescribed_for",
        daysOfSupply: "days_of_supply",
        photoUrl: "photo_url",
      };
      let paramIndex = 1;
      for (const [key, column] of Object.entries(fieldMap)) {
        if (key in request && request[key as keyof CreateMedicationRequest] !== undefined) {
          const value = request[key as keyof CreateMedicationRequest];
          fields.push(`${column} = $${paramIndex++}`);
          params.push(typeof value === "string" ? (value.trim() || null) : value ?? null);
        }
      }
      if (fields.length === 0) throw new ApiError(400, "No fields to update.");
      params.push(medicationId, userId);
      const result = await client.query(
        `UPDATE medications SET ${fields.join(", ")}
         WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
         RETURNING id::text, name, strength, dosage_form, route_of_administration,
                   active_ingredients, generic_name, prescribed_for, days_of_supply,
                   photo_url, active`,
        params,
      );
      return { medication: mapMedication(result.rows[0]) };
    });
  }

  async createSchedule(request: CreateScheduleRequest): Promise<CreateScheduleResponse> {
    return this.transaction(async (client) => {
      const userId = await this.getDefaultUserId(client);
      if (!request.medicationId?.trim()) throw new ApiError(400, "medicationId is required.");
      if (!request.scheduledTime?.trim()) throw new ApiError(400, "scheduledTime is required.");
      if (!request.startsOn?.trim()) throw new ApiError(400, "startsOn is required.");
      // Validate time format HH:MM
      if (!/^\d{2}:\d{2}$/.test(request.scheduledTime)) throw new ApiError(400, "scheduledTime must be HH:MM.");
      // Validate date format YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(request.startsOn)) throw new ApiError(400, "startsOn must be YYYY-MM-DD.");
      if (request.endsOn && !/^\d{4}-\d{2}-\d{2}$/.test(request.endsOn)) throw new ApiError(400, "endsOn must be YYYY-MM-DD.");

      // Ownership check
      const owns = await client.query(
        "SELECT 1 FROM medications WHERE id = $1 AND user_id = $2",
        [request.medicationId, userId],
      );
      if (!owns.rowCount) throw new ApiError(404, "Medication not found for this user.");

      const id = randomUUID();
      const result = await client.query(
        `INSERT INTO med_schedules (id, medication_id, scheduled_time, starts_on, ends_on)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id::text, medication_id::text, scheduled_time::text, starts_on::text, ends_on::text`,
        [id, request.medicationId, request.scheduledTime, request.startsOn, request.endsOn ?? null],
      );
      const row = result.rows[0];
      return {
        schedule: {
          id: row.id,
          medicationId: row.medication_id,
          scheduledTime: row.scheduled_time,
          startsOn: row.starts_on,
          endsOn: row.ends_on,
        },
      };
    });
  }

  // ── T2-03: Medicine explanation ──

  async getMedicineExplanation(medicineName: string): Promise<MedicineExplanationResponse> {
    if (!medicineName?.trim()) throw new ApiError(400, "Medicine name is required.");

    // For the demo, we use the fallback explanation from MedlinePlus module.
    // A real implementation would fetch from MedlinePlus Connect API by generic name.
    // The model may only rephrase this text; if no trusted text exists, show pharmacist referral.
    const baseInfo = { ...FALLBACK_EXPLANATION, medicineName: medicineName.trim() };

    // If an LLM API key is configured, attempt to rephrase the trusted text
    if (process.env.LLM_API_KEY && process.env.LLM_BASE_URL) {
      try {
        const rephrased = await this.rephraseWithModel(baseInfo.summary + " " + baseInfo.points.map((p) => p.text).join(" "), medicineName);
        if (rephrased) {
          const validation = validateRephrase(baseInfo.summary + " " + baseInfo.points.map((p) => p.text).join(" "), rephrased);
          if (validation.valid) {
            return {
              ...baseInfo,
              summary: rephrased,
              spokenText: rephrased,
              wordingSource: "model",
            };
          }
          // Rephrase rejected — show trusted source text
        }
      } catch {
        // Model failed — fall through to trusted text
      }
    }

    return {
      medicineName: baseInfo.medicineName,
      summary: baseInfo.summary,
      points: baseInfo.points,
      spokenText: baseInfo.spokenText,
      sourceCredit: baseInfo.sourceCredit,
      ndfUrl: NDF_URL,
      healthHubUrl: HEALTHHUB_MEDICATIONS_URL,
      wordingSource: "fallback",
    };
  }

  private async rephraseWithModel(sourceText: string, medicineName: string): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`${process.env.LLM_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.LLM_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.LLM_MODEL ?? "gpt-4o-mini",
          messages: [
            { role: "system", content: "You rephrase trusted medicine information into warm, simple language for seniors. Do not add new numbers, doses, medicine names, or medical advice. Do not diagnose." },
            { role: "user", content: `Rephrase this in one or two short sentences: ${sourceText}` },
          ],
          max_tokens: 2000,
        }),
        signal: controller.signal,
      });
      if (!response.ok) return null;
      const payload = await response.json() as { choices?: { message?: { content?: string } }[] };
      const text = payload.choices?.[0]?.message?.content?.trim();
      return text || null;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  // ── T2-09: Souvenirs ──

  async getSouvenirs(): Promise<SouvenirResponse> {
    const userId = await this.getDefaultUserId();
    const walkResult = await this.pool.query(
      "SELECT COALESCE(sum(distance_meters), 0)::int AS total FROM walk_sessions WHERE user_id = $1",
      [userId],
    );
    const cumulative = walkResult.rows[0].total;
    const unlockedRows = await this.pool.query(
      "SELECT souvenir_key, unlocked_at FROM souvenirs WHERE user_id = $1 ORDER BY unlocked_at",
      [userId],
    );
    const unlockedKeys = new Set(unlockedRows.rows.map((row) => row.souvenir_key));
    // Include tiers that should be unlocked even if not yet persisted (e.g. from cumulative distance)
    const allUnlocked = unlockedSouvenirs(cumulative);
    for (const key of allUnlocked) unlockedKeys.add(key);

    const unlocked = SOUVENIR_TIERS
      .filter((tier) => unlockedKeys.has(tier.key))
      .map((tier) => ({ key: tier.key, name: tier.name, note: tier.note }));

    const next = nextSouvenir(cumulative);
    const nextTarget = next
      ? {
          key: next.key,
          name: next.name,
          note: next.note,
          cumulativeMeters: next.cumulativeMeters,
          progress: cumulative / next.cumulativeMeters,
        }
      : null;

    return { unlocked, nextTarget, cumulativeMeters: cumulative };
  }

  // ── T2-11: Caretaker treats ──

  async getLatestTreat(): Promise<TreatResponse | null> {
    const userId = await this.getDefaultUserId();
    const result = await this.pool.query(
      `SELECT id::text AS id, message, given_at, seen FROM treats
       WHERE user_id = $1 ORDER BY given_at DESC LIMIT 1`,
      [userId],
    );
    if (!result.rows[0]) return null;
    return {
      id: result.rows[0].id,
      message: result.rows[0].message,
      givenAt: iso(result.rows[0].given_at),
      seen: result.rows[0].seen,
    };
  }

  async sendTreat(message?: string): Promise<TreatResponse> {
    return this.transaction(async (client) => {
      const userId = await this.getDefaultUserId(client);
      const caregiverResult = await client.query(
        "SELECT caregiver_id FROM user_caregivers WHERE user_id = $1 ORDER BY caregiver_id LIMIT 1",
        [userId],
      );
      const id = randomUUID();
      const result = await client.query(
        `INSERT INTO treats (id, user_id, caregiver_id, message)
         VALUES ($1, $2, $3, $4)
         RETURNING id::text AS id, message, given_at, seen`,
        [
          id, userId,
          caregiverResult.rows[0]?.caregiver_id ?? null,
          message?.trim() || "A treat from your caretaker!",
        ],
      );
      const row = result.rows[0];
      return {
        id: row.id,
        message: row.message,
        givenAt: iso(row.given_at),
        seen: row.seen,
      };
    });
  }

  async markTreatSeen(treatId: string): Promise<void> {
    return this.transaction(async (client) => {
      const userId = await this.getDefaultUserId(client);
      await client.query(
        "UPDATE treats SET seen = true WHERE id = $1 AND user_id = $2",
        [treatId, userId],
      );
    });
  }

  // ── T2-12: Milestones derived from data ──

  async getMilestones(): Promise<MilestonesResponse> {
    const userId = await this.getDefaultUserId();
    const identity = await this.pool.query(
      `SELECT u.timezone, d.heart, d.streak
       FROM users u JOIN dogs d ON d.user_id = u.id WHERE u.id = $1`,
      [userId],
    );
    const person = identity.rows[0];

    const caringResult = await this.pool.query(
      `WITH first_dose AS (
         SELECT MIN(de.occurred_at) AS first_at
         FROM dose_events de
         JOIN med_schedules ms ON ms.id = de.schedule_id
         JOIN medications m ON m.id = ms.medication_id
         WHERE m.user_id = $1 AND de.event = 'taken'
       )
       SELECT COALESCE(
         GREATEST(EXTRACT(day FROM now() - first_at)::int, 0), 0
       ) AS caring_days FROM first_dose`,
      [userId],
    );
    const caringDays = caringResult.rows[0]?.caring_days ?? 0;

    const walkResult = await this.pool.query(
      "SELECT count(*)::int AS count, COALESCE(sum(distance_meters), 0)::int AS total FROM walk_sessions WHERE user_id = $1",
      [userId],
    );

    const souvenirResult = await this.pool.query(
      "SELECT souvenir_key FROM souvenirs WHERE user_id = $1 ORDER BY unlocked_at",
      [userId],
    );
    const cumulativeWalk = walkResult.rows[0].total;
    const unlockedKeys = new Set(souvenirResult.rows.map((row) => row.souvenir_key));
    for (const key of unlockedSouvenirs(cumulativeWalk)) unlockedKeys.add(key);

    const unlockedSouvenirsList = SOUVENIR_TIERS
      .filter((tier) => unlockedKeys.has(tier.key))
      .map((tier) => ({ key: tier.key, name: tier.name, note: tier.note }));

    // Tricks derived from streak milestones
    const streak = person.streak;
    const trickDefs = [
      { name: "Sit", threshold: 1, milestoneNote: "1 day streak" },
      { name: "Wave", threshold: 7, milestoneNote: "7 day streak" },
      { name: "Roll over", threshold: 14, milestoneNote: "14 day streak" },
      { name: "New trick", threshold: 30, milestoneNote: "30 day streak" },
    ];
    const tricks = trickDefs.map((def) => ({
      name: def.name,
      note: streak >= def.threshold ? def.milestoneNote : `${def.threshold - streak} days to go`,
      earned: streak >= def.threshold,
    }));

    // World derived from cumulative walk distance
    const worldThresholds = [
      { id: "flat", label: "Our flat", levelText: "WORLD 1", description: "Where it all begins.", threshold: 0 },
      { id: "garden", label: "Garden", levelText: "WORLD 2", description: "Unlocked at 1 km total walking.", threshold: 1_000 },
      { id: "kampung", label: "Kampung", levelText: "WORLD 3", description: "Unlocked at 5 km total walking.", threshold: 5_000 },
    ];
    const currentWorldIdx = worldThresholds.reduce((best, w, idx) => cumulativeWalk >= w.threshold ? idx : best, 0);
    const currentWorld = worldThresholds[currentWorldIdx];
    const nextWorld = worldThresholds[currentWorldIdx + 1];
    const progress = nextWorld
      ? Math.min(1, cumulativeWalk / nextWorld.threshold)
      : 1;

    return {
      caringDays,
      streak,
      cumulativeWalkMeters: cumulativeWalk,
      walkCount: walkResult.rows[0].count,
      unlockedSouvenirs: unlockedSouvenirsList,
      nextSouvenirTarget: nextSouvenir(cumulativeWalk)
        ? (() => {
            const ns = nextSouvenir(cumulativeWalk)!;
            return { key: ns.key, name: ns.name, note: ns.note, cumulativeMeters: ns.cumulativeMeters, progress: cumulativeWalk / ns.cumulativeMeters };
          })()
        : null,
      tricks,
      currentWorld: {
        id: currentWorld.id,
        label: currentWorld.label,
        levelText: currentWorld.levelText,
        description: currentWorld.description,
        progress,
      },
    };
  }

  // ── T2-08: Pill photo recognition (demo only) ──
  // The reference (original) photo is set once in medicine settings; every check-in compares
  // against that reference. If no reference is set, verifyPill rejects with 422.

  /** Set the SETTINGS-defined original/reference pill photo for a medication.
   *  Generates and stores a vision description used later to compare check-in photos. */
  async setPillReference(request: PillReferenceRequest): Promise<PillReferenceResponse> {
    if (!process.env.LLM_API_KEY || !process.env.LLM_BASE_URL) {
      throw new ApiError(503, "LLM API is not configured. Set LLM_API_KEY and LLM_BASE_URL.");
    }
    const userId = await this.getDefaultUserId();
    const existing = await this.pool.query(
      "SELECT id FROM medications WHERE id = $1 AND user_id = $2",
      [request.medicationId, userId],
    );
    if (!existing.rowCount) throw new ApiError(404, "Medication not found.");
    const description = await this.describePillWithVision(request.imageBase64, request.mimeType);
    if (!description) throw new ApiError(502, "The vision model did not return a description.");
    const dataUrl = `data:${request.mimeType};base64,${request.imageBase64}`;
    await this.pool.query(
      "UPDATE medications SET pill_reference_image = $2, pill_reference_description = $3, pill_reference_set_at = now() WHERE id = $1",
      [request.medicationId, dataUrl, description],
    );
    return {
      medicationId: request.medicationId,
      description,
      set: true,
    };
  }

  /** The saved original pill photo for a medicine (read-only), or 404 when none is set. */
  async getPillReference(medicationId: string): Promise<PillReferenceImageResponse> {
    const userId = await this.getDefaultUserId();
    const result = await this.pool.query(
      "SELECT pill_reference_image, pill_reference_set_at FROM medications WHERE id = $1 AND user_id = $2",
      [medicationId, userId],
    );
    const row = result.rows[0];
    if (!row) throw new ApiError(404, "Medication not found.");
    if (!row.pill_reference_image) throw new ApiError(404, "No original pill photo is set for this medicine.");
    return { medicationId, imageDataUrl: row.pill_reference_image, setAt: iso(row.pill_reference_set_at) };
  }

  async verifyPill(request: PillVerifyRequest): Promise<PillVerifyResponse> {
    if (!process.env.LLM_API_KEY || !process.env.LLM_BASE_URL) {
      throw new ApiError(503, "LLM API is not configured. Set LLM_API_KEY and LLM_BASE_URL.");
    }
    const userId = await this.getDefaultUserId();
    const result = await this.pool.query(
      "SELECT pill_reference_description FROM medications WHERE id = $1 AND user_id = $2",
      [request.medicationId, userId],
    );
    if (!result.rowCount) throw new ApiError(404, "Medication not found.");
    const referenceDescription = result.rows[0].pill_reference_description;
    // No original picture set in settings → the senior must set it before check-ins can compare.
    if (!referenceDescription) {
      throw new ApiError(422, "No reference pill photo is set for this medicine. Set the original picture in the medicine settings first.");
    }
    const newDescription = await this.describePillWithVision(request.imageBase64, request.mimeType);
    if (!newDescription) throw new ApiError(502, "The vision model did not return a description.");
    const referenceKeywords = new Set(extractKeywords(referenceDescription));
    const newKeywords = new Set(extractKeywords(newDescription));
    const intersection = [...newKeywords].filter((k) => referenceKeywords.has(k));
    const union = new Set([...referenceKeywords, ...newKeywords]);
    const similarity = union.size > 0 ? intersection.length / union.size : 0;
    return {
      medicationId: request.medicationId,
      match: similarity >= 0.5,
      referenceDescription,
      newDescription,
      similarity,
    };
  }

  private async describePillWithVision(imageBase64: string, mimeType: string): Promise<string | null> {
    const model = process.env.LLM_VISION_MODEL ?? process.env.LLM_MODEL ?? "gpt-4o-mini";
    const controller = new AbortController();
    // NVIDIA's free vision model can cold-start slowly; give it most of the function's time budget.
    const timeout = setTimeout(() => controller.abort(), 55_000);
    try {
      const dataUrl = `data:${mimeType};base64,${imageBase64}`;
      const response = await fetch(`${process.env.LLM_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.LLM_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: "You describe a pill or medicine in a photo for a medication safety demo. List key visual characteristics: colour, shape, markings, imprint text, size, coating, score line. Be concise (2-3 short sentences). Do not identify the drug or give medical advice.",
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Describe the key visual characteristics of the medicine in this photo." },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
          max_tokens: 2000,
        }),
        signal: controller.signal,
      });
      if (!response.ok) return null;
      const payload = await response.json() as { choices?: { message?: { content?: string } }[] };
      const text = payload.choices?.[0]?.message?.content?.trim();
      return text || null;
    } catch {
      // Network error or timeout (cold start) — retryable; surfaced to the UI as a 504 "try again".
      throw new ApiError(504, "The vision model took too long to respond. Please try again.");
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Warm (load) the vision model without persisting anything. Fire-and-forget from the mobile app
   *  so the first real pill check hits an already-warm instance instead of a slow cold start. */
  async warmupPillVision(): Promise<boolean> {
    if (!process.env.LLM_API_KEY || !process.env.LLM_BASE_URL) return false;
    // 1x1 transparent PNG — enough to trigger model loading; the description is discarded.
    const tinyPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC";
    try {
      const description = await this.describePillWithVision(tinyPng, "image/png");
      return description !== null;
    } catch {
      return false;
    }
  }
}

/** Extract lowercase keywords from a pill description for fuzzy comparison. */
function extractKeywords(text: string): string[] {
  const stopWords = new Set(["the", "a", "an", "is", "are", "with", "and", "of", "to", "in", "on", "it", "this", "that", "pill", "medicine", "tablet", "capsule", "photo"]);
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !stopWords.has(word));
}
