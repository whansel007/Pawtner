// api/repository.ts
import { randomUUID } from "node:crypto";

// shared/config.ts
var DEMO_RULES = {
  nudgeDelayMinutes: 60,
  nudgeIntervalMinutes: 60,
  maxNudgesPerDose: 2,
  caretakerMinimumThreshold: 2,
  defaultCaretakerThreshold: 2,
  restockDaysOfSupply: 5,
  highSystolic: 180,
  highDiastolic: 120,
  repeatedHighReadingSystolic: 140,
  repeatedHighReadingDiastolic: 90,
  repeatedHighReadingsRequired: 3,
  repeatedHighReadingWindowDays: 7,
  heartMinimum: 0,
  heartMaximum: 4,
  heartScale: 4,
  heartWhenNothingDue: 2,
  heartBloodPressureBonus: 1,
  streakMilestones: [3, 7, 14, 30],
  /** Minutes the dog stays joyful after a celebrate decision before reverting to heart-based mood. */
  celebrateJoyfulMinutes: 30
};
var EMERGENCY_SYMPTOM_KEYWORDS = [
  "chest pain",
  "breathlessness",
  "shortness of breath",
  "fainting",
  "fainted",
  "confusion",
  "one-sided weakness",
  "slurred speech"
];
var HIGH_READING_SYMPTOM_KEYWORDS = [
  ...EMERGENCY_SYMPTOM_KEYWORDS,
  "headache",
  "dizzy",
  "dizziness",
  "nausea"
];
var POSSIBLE_SIDE_EFFECT_KEYWORDS = ["sleepy", "dizzy", "nausea"];

// shared/templates.ts
var DECISION_TEMPLATES = {
  nudge: "I'm here with you. When you're ready, check your medicine schedule.",
  celebrate: "A lovely moment together. Your care routine is moving along.",
  restock_reminder: "Your supply may be getting low. Please check with your pharmacy when convenient.",
  doctor_question: "Would you like to ask your doctor or pharmacist about how you've been feeling?",
  see_gp_soon: "The app's demo rules suggest arranging a check with your GP soon. This is not medical advice.",
  emergency_995: "Call 995 now. This app cannot provide emergency care.",
  stay_quiet: "I'm here beside you."
};

// shared/rules.ts
function includesAny(text, keywords) {
  const normalized = text.toLowerCase();
  return keywords.some((word) => normalized.includes(word));
}
function isHighReading(systolic, diastolic) {
  return systolic >= DEMO_RULES.highSystolic || diastolic >= DEMO_RULES.highDiastolic;
}
function selectDogMood(heart, latestDecision, now) {
  if (latestDecision?.decision === "emergency_995" || latestDecision?.decision === "see_gp_soon") return "attentive";
  if (latestDecision?.decision === "nudge") return "sleepy";
  if (latestDecision?.decision === "celebrate") {
    const elapsedMs = Date.parse(now) - Date.parse(latestDecision.createdAt);
    if (elapsedMs < DEMO_RULES.celebrateJoyfulMinutes * 6e4) return "joyful";
  } else if (heart >= DEMO_RULES.heartMaximum) {
    return "joyful";
  }
  if (latestDecision?.decision === "restock_reminder" || latestDecision?.decision === "doctor_question") return "content";
  if (heart <= 1) return "sleepy";
  return "content";
}
function decision(input, kind, ruleId, reasoning, observations, caretakerPing = false, targetDose) {
  const base = {
    id: `decision-${Date.parse(input.now)}`,
    decision: kind,
    ruleId,
    observations,
    reasoning,
    wording: DECISION_TEMPLATES[kind],
    wordingSource: "template",
    caretakerPing,
    refused: false,
    createdAt: input.now
  };
  return { ...base, ...targetDose, mood: selectDogMood(input.dog.heart, { decision: kind, createdAt: input.now }, input.now) };
}
function decide(input) {
  const nowMs = Date.parse(input.now);
  const metrics = input.healthMetrics.filter((metric) => Date.parse(metric.recordedAt) <= nowMs);
  const latestMetric = [...metrics].sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt))[0];
  const latestNote = latestMetric?.note ?? "";
  const emergencyNote = metrics.find((metric) => includesAny(metric.note ?? "", EMERGENCY_SYMPTOM_KEYWORDS));
  const highReadingSymptom = latestMetric && isHighReading(latestMetric.systolic, latestMetric.diastolic) && includesAny(latestNote, HIGH_READING_SYMPTOM_KEYWORDS);
  if (emergencyNote || highReadingSymptom) {
    return decision(
      input,
      "emergency_995",
      emergencyNote ? "emergency_symptom_note" : "bp_high_with_symptom",
      "A configured emergency symptom or a symptom with a high reading was recorded; emergency wording is fixed and uses no model.",
      { symptomDetected: true, highReading: Boolean(highReadingSymptom) }
    );
  }
  const repeatedHighReadings = metrics.filter((metric) => {
    const withinWindow = nowMs - Date.parse(metric.recordedAt) <= DEMO_RULES.repeatedHighReadingWindowDays * 864e5;
    return withinWindow && metric.systolic >= DEMO_RULES.repeatedHighReadingSystolic && metric.diastolic >= DEMO_RULES.repeatedHighReadingDiastolic;
  });
  if (latestMetric && isHighReading(latestMetric.systolic, latestMetric.diastolic)) {
    return decision(
      input,
      "see_gp_soon",
      "bp_high_without_symptom",
      "A blood-pressure reading met a configured demo threshold without a detected symptom.",
      { systolic: latestMetric.systolic, diastolic: latestMetric.diastolic, symptomDetected: false }
    );
  }
  if (repeatedHighReadings.length >= DEMO_RULES.repeatedHighReadingsRequired) {
    return decision(
      input,
      "see_gp_soon",
      "repeated_high_readings_7d",
      "Three or more readings met the configured demo threshold in the seven-day window.",
      { qualifyingReadings: repeatedHighReadings.length, windowDays: DEMO_RULES.repeatedHighReadingWindowDays }
    );
  }
  const sideEffectMetric = [...metrics].reverse().find((metric) => includesAny(metric.note ?? "", POSSIBLE_SIDE_EFFECT_KEYWORDS));
  if (sideEffectMetric) {
    return decision(
      input,
      "doctor_question",
      "possible_side_effect_note",
      "A note contains a configured possible-side-effect keyword; add it as a question for a professional.",
      { noteRecordedAt: sideEffectMetric.recordedAt }
    );
  }
  const caretaker = input.caretaker;
  if (caretaker?.optedIn && caretaker.threshold >= DEMO_RULES.caretakerMinimumThreshold && input.consecutiveMissedDoses >= caretaker.threshold) {
    return decision(
      input,
      "nudge",
      "repeated_misses_caretaker_check_in",
      "Consecutive missed doses reached the opted-in caretaker threshold.",
      { consecutiveMissedDoses: input.consecutiveMissedDoses, caretakerThreshold: caretaker.threshold },
      true
    );
  }
  const missedDose = input.doses.find((dose) => {
    if (dose.status !== "missed" || dose.nudgeCount >= DEMO_RULES.maxNudgesPerDose) return false;
    if (dose.nudgeCount === 0) {
      return nowMs - Date.parse(dose.scheduledAt) >= DEMO_RULES.nudgeDelayMinutes * 6e4;
    }
    return dose.nudgeCount === 1 && dose.lastNudgeAt !== null && nowMs - Date.parse(dose.lastNudgeAt) >= DEMO_RULES.nudgeIntervalMinutes * 6e4;
  });
  if (missedDose) {
    const second = missedDose.nudgeCount === 1;
    return decision(
      input,
      "nudge",
      second ? "dose_nudge_2" : "dose_nudge_1",
      second ? "The dose remains untaken at least 60 minutes after the first nudge." : "The dose remains untaken at least 60 minutes after its scheduled time.",
      { scheduleId: missedDose.id, scheduledFor: missedDose.scheduledAt, nudgeCount: missedDose.nudgeCount + 1 },
      false,
      { scheduleId: missedDose.id, scheduledFor: missedDose.scheduledAt }
    );
  }
  const supplyEntry = Object.entries(input.daysOfSupplyByMedicationId).find(([, days]) => days !== null && days <= DEMO_RULES.restockDaysOfSupply);
  if (supplyEntry) {
    return decision(
      input,
      "restock_reminder",
      "low_days_of_supply",
      "A medication's remaining supply reached the configured reminder threshold.",
      { medicationId: supplyEntry[0], daysOfSupply: supplyEntry[1] }
    );
  }
  if (input.latestDoseEvent?.event === "taken" || input.walkFinished || input.streakMilestoneReached) {
    return decision(
      input,
      "celebrate",
      "care_milestone_completed",
      "A dose, walk or streak milestone was completed.",
      { doseTaken: input.latestDoseEvent?.event === "taken", walkFinished: Boolean(input.walkFinished), streakMilestoneReached: Boolean(input.streakMilestoneReached) }
    );
  }
  return decision(input, "stay_quiet", "nothing_needs_attention", "No configured rule currently needs attention.", { heart: input.dog.heart });
}

// shared/selectors.ts
function deriveDoseStatus(schedule, events, now, nudgeHistory = { count: 0, lastAt: null }) {
  const event = events.filter((item) => item.scheduleId === schedule.id && Date.parse(item.scheduledFor) === Date.parse(schedule.scheduledAt) && Date.parse(item.occurredAt) <= Date.parse(now)).sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))[0];
  let status;
  if (event?.event === "taken") status = "taken";
  else if (event?.event === "skipped") status = "skipped";
  else {
    const elapsed = Date.parse(now) - Date.parse(schedule.scheduledAt);
    if (elapsed < 0) status = "upcoming";
    else if (elapsed < DEMO_RULES.nudgeDelayMinutes * 6e4) status = "due";
    else status = "missed";
  }
  return {
    ...schedule,
    status,
    eventAt: event?.occurredAt ?? null,
    nudgeCount: nudgeHistory.count,
    lastNudgeAt: nudgeHistory.lastAt
  };
}
function computeHeart(doses, bloodPressureLoggedToday) {
  const due = doses.filter((dose) => dose.status !== "upcoming");
  const base = due.length === 0 ? DEMO_RULES.heartWhenNothingDue : Math.floor(due.filter((dose) => dose.status === "taken").length / due.length * DEMO_RULES.heartScale);
  return Math.min(
    DEMO_RULES.heartMaximum,
    Math.max(DEMO_RULES.heartMinimum, base + (bloodPressureLoggedToday ? DEMO_RULES.heartBloodPressureBonus : 0))
  );
}
function computeStreak(days, today) {
  const byDate = /* @__PURE__ */ new Map();
  for (const item of days) byDate.set(item.date, [...byDate.get(item.date) ?? [], item]);
  let streak = 0;
  const cursor = /* @__PURE__ */ new Date(`${today}T00:00:00.000Z`);
  cursor.setUTCDate(cursor.getUTCDate() - 1);
  for (; ; ) {
    const date = cursor.toISOString().slice(0, 10);
    const scheduled = byDate.get(date);
    if (!scheduled?.length || scheduled.some((dose) => !dose.taken)) return streak;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
}
function hasBloodPressureToday(metrics, today) {
  return metrics.some((metric) => metric.recordedAt.slice(0, 10) === today);
}
function buildAgentInput(input) {
  if (input.caretaker && input.caretaker.threshold < DEMO_RULES.caretakerMinimumThreshold) {
    throw new RangeError(`Caretaker threshold must be at least ${DEMO_RULES.caretakerMinimumThreshold}.`);
  }
  return input;
}
function selectAgentInput(source) {
  const occurrences = [...source.doseOccurrences].sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  const derived = occurrences.map((schedule) => {
    const nudgeHistory = source.nudges.filter((nudge) => nudge.scheduleId === schedule.id && Date.parse(nudge.scheduledFor) === Date.parse(schedule.scheduledAt) && Date.parse(nudge.createdAt) <= Date.parse(source.now)).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    return deriveDoseStatus(schedule, source.doseEvents, source.now, {
      count: nudgeHistory.length,
      lastAt: nudgeHistory.at(-1)?.createdAt ?? null
    });
  });
  const todayDoses = derived.filter((dose) => dose.scheduledAt.slice(0, 10) === source.today);
  const metrics = source.healthMetrics.filter((metric) => Date.parse(metric.recordedAt) <= Date.parse(source.now));
  const streak = computeStreak(derived.map((dose) => ({
    date: dose.scheduledAt.slice(0, 10),
    scheduleId: dose.id,
    taken: dose.status === "taken"
  })), source.today);
  const completedOrMissed = derived.filter((dose) => Date.parse(dose.scheduledAt) <= Date.parse(source.now));
  let consecutiveMissedDoses = 0;
  for (const dose of [...completedOrMissed].reverse()) {
    if (dose.status !== "missed") break;
    consecutiveMissedDoses += 1;
  }
  const latestDoseEvent = source.triggeringDoseEventId ? source.doseEvents.find((event) => event.id === source.triggeringDoseEventId && Date.parse(event.occurredAt) <= Date.parse(source.now)) ?? null : null;
  return buildAgentInput({
    now: source.now,
    userId: source.userId,
    dog: {
      ...source.dog,
      heart: computeHeart(todayDoses, hasBloodPressureToday(metrics, source.today)),
      streak
    },
    doses: todayDoses,
    latestDoseEvent,
    healthMetrics: metrics,
    daysOfSupplyByMedicationId: source.daysOfSupplyByMedicationId,
    consecutiveMissedDoses,
    caretaker: source.caretaker
  });
}

// shared/wording.ts
async function applyModelWording(decision2, options) {
  const fallback = { ...decision2, wordingSource: "template" };
  if (decision2.decision === "emergency_995" || decision2.refused || !options.apiKey || !options.generate) return fallback;
  let timeout;
  try {
    const wording = await Promise.race([
      options.generate(decision2),
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Model wording timed out")), options.timeoutMs);
      })
    ]);
    if (!wording.trim()) return fallback;
    return { ...decision2, wording: wording.trim(), wordingSource: "model" };
  } catch {
    return fallback;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

// shared/souvenirs.ts
var SOUVENIR_TIERS = [
  { key: "marina_bay", name: "Marina Bay sparkle", note: "Walked 1 km together", cumulativeMeters: 1e3 },
  { key: "botanic_gardens", name: "Botanic Gardens leaf", note: "Walked 3 km together", cumulativeMeters: 3e3 },
  { key: "east_coast", name: "East Coast breeze", note: "Walked 5 km together", cumulativeMeters: 5e3 },
  { key: "sentosa", name: "Sentosa sunset", note: "Walked 10 km together", cumulativeMeters: 1e4 },
  { key: "macritchie", name: "MacRitchie trail", note: "Walked 21 km together", cumulativeMeters: 21e3 }
];
function unlockedSouvenirs(cumulativeMeters) {
  return SOUVENIR_TIERS.filter((tier) => cumulativeMeters >= tier.cumulativeMeters).map((tier) => tier.key);
}
function nextSouvenir(cumulativeMeters) {
  return SOUVENIR_TIERS.find((tier) => cumulativeMeters < tier.cumulativeMeters) ?? null;
}

// shared/medlineplus.ts
function extractNumbers(text) {
  const matches = text.match(/\d+(?:\.\d+)?/g);
  return new Set(matches ?? []);
}
function extractNames(text) {
  const words = text.match(/\b[A-Z]{3,}\b/g);
  return new Set(words ?? []);
}
function validateRephrase(sourceText, rephrasedText) {
  const sourceNumbers = extractNumbers(sourceText);
  const rephraseNumbers = extractNumbers(rephrasedText);
  for (const num of rephraseNumbers) {
    if (!sourceNumbers.has(num)) {
      return { valid: false, reason: `Rephrase contains a number "${num}" not in the source text.` };
    }
  }
  const sourceCaps = extractNames(sourceText);
  const rephraseCaps = extractNames(rephrasedText);
  for (const name of rephraseCaps) {
    if (!sourceCaps.has(name)) {
      return { valid: false, reason: `Rephrase contains a name "${name}" not in the source text.` };
    }
  }
  return { valid: true };
}
var NDF_URL = "https://www.ndf.gov.sg/";
var HEALTHHUB_MEDICATIONS_URL = "https://www.healthhub.sg/a-z/medications";
var FALLBACK_EXPLANATION = {
  medicineName: "",
  summary: "Please ask your pharmacist about this medicine.",
  points: [
    { label: "What to do", text: "Ask your pharmacist what this medicine is for and how to take it safely." }
  ],
  spokenText: "Please ask your pharmacist about this medicine.",
  sourceCredit: "Information from MedlinePlus.gov",
  ndfUrl: NDF_URL,
  healthHubUrl: HEALTHHUB_MEDICATIONS_URL
};

// api/repository.ts
var ApiError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
  status;
};
function iso(value) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
function localDate(now, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(now));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
function shiftDate(date, amount) {
  const value = /* @__PURE__ */ new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}
function mapDecision(row) {
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
    ...row.refusal_kind ? { refusalKind: row.refusal_kind } : {},
    ...row.schedule_id ? { scheduleId: row.schedule_id, scheduledFor: iso(row.scheduled_for) } : {},
    createdAt: iso(row.created_at)
  };
}
function mapMetric(row) {
  return {
    id: row.id,
    kind: "blood_pressure",
    systolic: row.systolic,
    diastolic: row.diastolic,
    note: row.note,
    recordedAt: iso(row.recorded_at)
  };
}
function mapEvent(row) {
  return {
    id: row.id,
    scheduleId: row.schedule_id,
    scheduledFor: iso(row.scheduled_for),
    event: row.event,
    occurredAt: iso(row.occurred_at),
    proofPhotoUrl: row.proof_photo_url
  };
}
function mapMedication(row) {
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
    active: row.active
  };
}
var PawtnerRepository = class {
  constructor(pool2) {
    this.pool = pool2;
  }
  pool;
  async searchRegisteredProducts(query) {
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
      [`%${term}%`, query.trim(), `${term}%`]
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
        sourceAttribution: row.source_attribution
      }))
    };
  }
  async transaction(callback) {
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
  async getDefaultUserId(client = this.pool) {
    const result = await client.query("SELECT id::text FROM users ORDER BY created_at, id LIMIT 1");
    if (!result.rows[0]) throw new ApiError(503, "No demo user is seeded. Run db:seed first.");
    return result.rows[0].id;
  }
  async loadInput(client, userId, now, triggeringDoseEventId) {
    const personResult = await client.query(
      `SELECT u.timezone, d.id::text AS dog_id, d.name AS dog_name
       FROM users u JOIN dogs d ON d.user_id = u.id WHERE u.id = $1`,
      [userId]
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
      [userId, today]
    );
    const schedules = scheduleResult.rows.map((row) => ({
      id: row.id,
      medicationId: row.medication_id,
      medicationName: row.medication_name,
      strength: row.strength,
      scheduledAt: iso(row.scheduled_at)
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
      [userId, earliest, now]
    );
    const events = eventsResult.rows.map(mapEvent);
    const nudgesResult = await client.query(
      `SELECT schedule_id::text AS schedule_id, scheduled_for, created_at
       FROM agent_decisions
       WHERE user_id = $1 AND decision = 'nudge' AND schedule_id IS NOT NULL
         AND created_at <= $2::timestamptz AND scheduled_for >= $3::timestamptz
       ORDER BY created_at`,
      [userId, now, earliest]
    );
    const metricsResult = await client.query(
      `SELECT id::text AS id, systolic, diastolic, note, recorded_at
       FROM health_metrics WHERE user_id = $1 AND recorded_at <= $2::timestamptz
       ORDER BY recorded_at DESC`,
      [userId, now]
    );
    const medsResult = await client.query(
      "SELECT id::text, days_of_supply FROM medications WHERE user_id = $1 AND active = true",
      [userId]
    );
    const caregiverResult = await client.query(
      `SELECT opted_in, threshold FROM user_caregivers WHERE user_id = $1 ORDER BY caregiver_id LIMIT 1`,
      [userId]
    );
    const nudgeRows = nudgesResult.rows.map((row) => ({
      scheduleId: row.schedule_id,
      scheduledFor: iso(row.scheduled_for),
      createdAt: iso(row.created_at)
    }));
    const source = {
      now,
      today,
      userId,
      dog: { id: person.dog_id, name: person.dog_name },
      doseOccurrences: schedules,
      doseEvents: events,
      nudges: nudgeRows,
      healthMetrics: metricsResult.rows.map((row) => ({ ...mapMetric(row), kind: "blood_pressure" })),
      daysOfSupplyByMedicationId: Object.fromEntries(medsResult.rows.map((row) => [row.id, row.days_of_supply])),
      caretaker: caregiverResult.rows[0] ? { optedIn: caregiverResult.rows[0].opted_in, threshold: caregiverResult.rows[0].threshold } : null,
      ...triggeringDoseEventId ? { triggeringDoseEventId } : {}
    };
    return selectAgentInput(source);
  }
  async latestDecision(client, userId, now) {
    const result = await client.query(
      `SELECT * FROM agent_decisions WHERE user_id = $1 AND ($2::timestamptz IS NULL OR created_at <= $2::timestamptz)
       ORDER BY created_at DESC LIMIT 1`,
      [userId, now ?? null]
    );
    return mapDecision(result.rows[0]);
  }
  async today(client, userId, now, triggerEventId) {
    const input = await this.loadInput(client, userId, now, triggerEventId);
    const userResult = await client.query("SELECT id::text, name FROM users WHERE id = $1", [userId]);
    const dogResult = await client.query("SELECT id::text, name, mood FROM dogs WHERE user_id = $1", [userId]);
    const timezoneResult = await client.query("SELECT timezone FROM users WHERE id = $1", [userId]);
    const today = localDate(now, timezoneResult.rows[0].timezone);
    const healthMetrics = input.healthMetrics.filter((metric) => localDate(metric.recordedAt, timezoneResult.rows[0].timezone) === today);
    const latestDecision = await this.latestDecision(client, userId, now);
    const dog = dogResult.rows[0];
    return {
      user: userResult.rows[0],
      dog: { id: dog.id, name: dog.name, mood: selectDogMood(input.dog.heart, latestDecision, now), heart: input.dog.heart, streak: input.dog.streak },
      doses: input.doses,
      healthMetrics,
      bloodPressureLoggedToday: healthMetrics.length > 0,
      latestDecision
    };
  }
  async saveDecision(client, userId, decision2) {
    const persisted = { ...decision2, id: randomUUID() };
    await client.query(
      `INSERT INTO agent_decisions
         (id, user_id, schedule_id, decision, rule_id, scheduled_for, mood, observations,
          reasoning, wording, wording_source, caretaker_ping, refused, refusal_kind, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14, $15)`,
      [
        persisted.id,
        userId,
        persisted.scheduleId ?? null,
        persisted.decision,
        persisted.ruleId,
        persisted.scheduledFor ?? null,
        persisted.mood,
        JSON.stringify(persisted.observations),
        persisted.reasoning,
        persisted.wording,
        persisted.wordingSource,
        persisted.caretakerPing,
        persisted.refused,
        persisted.refusalKind ?? null,
        persisted.createdAt
      ]
    );
    return persisted;
  }
  async decideAndPersist(client, userId, now, triggerEventId, extra) {
    const input = await this.loadInput(client, userId, now, triggerEventId);
    const decisionInput = { ...input, ...extra };
    const rawDecision = decide(decisionInput);
    const decisionWithWording = await applyModelWording(rawDecision, {
      apiKey: process.env.LLM_API_KEY,
      timeoutMs: 1500
    });
    const saved = await this.saveDecision(client, userId, decisionWithWording);
    await client.query(
      "UPDATE dogs SET heart = $2, streak = $3, mood = $4 WHERE user_id = $1",
      [userId, input.dog.heart, input.dog.streak, saved.mood]
    );
    return { input, decision: saved };
  }
  async getToday(now = (/* @__PURE__ */ new Date()).toISOString()) {
    const userId = await this.getDefaultUserId();
    return this.today(this.pool, userId, now);
  }
  async recordDoseEvent(request) {
    return this.transaction(async (client) => {
      const userId = await this.getDefaultUserId(client);
      const validSchedule = await client.query(
        `SELECT ms.id FROM med_schedules ms
         JOIN medications m ON m.id = ms.medication_id JOIN users u ON u.id = m.user_id
         WHERE ms.id = $1 AND u.id = $2
           AND (ms.starts_on <= ($3::timestamptz AT TIME ZONE u.timezone)::date)
           AND (ms.ends_on IS NULL OR ms.ends_on >= ($3::timestamptz AT TIME ZONE u.timezone)::date)
           AND ms.scheduled_time = ($3::timestamptz AT TIME ZONE u.timezone)::time`,
        [request.scheduleId, userId, request.scheduledFor]
      );
      if (!validSchedule.rowCount) throw new ApiError(404, "Dose schedule occurrence not found.");
      const id = randomUUID();
      const inserted = await client.query(
        `INSERT INTO dose_events (id, schedule_id, scheduled_for, event, occurred_at, proof_photo_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id::text AS id, schedule_id::text AS schedule_id, scheduled_for, event, occurred_at, proof_photo_url`,
        [id, request.scheduleId, request.scheduledFor, request.event, request.occurredAt, request.proofPhotoUrl ?? null]
      );
      const { decision: decision2 } = await this.decideAndPersist(client, userId, request.occurredAt, id);
      return {
        event: mapEvent(inserted.rows[0]),
        today: await this.today(client, userId, request.occurredAt),
        decision: decision2
      };
    });
  }
  async recordHealthMetric(request) {
    return this.transaction(async (client) => {
      const userId = await this.getDefaultUserId(client);
      const id = randomUUID();
      const inserted = await client.query(
        `INSERT INTO health_metrics (id, user_id, kind, systolic, diastolic, note, recorded_at)
         VALUES ($1, $2, 'blood_pressure', $3, $4, $5, $6)
         RETURNING id::text AS id, systolic, diastolic, note, recorded_at`,
        [id, userId, request.systolic, request.diastolic, request.note ?? null, request.recordedAt]
      );
      const { decision: decision2 } = await this.decideAndPersist(client, userId, request.recordedAt);
      return { metric: mapMetric(inserted.rows[0]), decision: decision2 };
    });
  }
  async decideNow(userId, now) {
    return this.transaction(async (client) => {
      const exists = await client.query("SELECT 1 FROM users WHERE id = $1", [userId]);
      if (!exists.rowCount) throw new ApiError(404, "User not found.");
      return (await this.decideAndPersist(client, userId, now)).decision;
    });
  }
  async getCaretakerSummary(now = (/* @__PURE__ */ new Date()).toISOString()) {
    const userId = await this.getDefaultUserId();
    const identity = await this.pool.query(
      `SELECT u.id::text AS user_id, u.name AS senior_name, u.timezone,
              d.id::text AS dog_id, d.name AS dog_name, d.mood,
              c.id::text AS caregiver_id, c.name AS caregiver_name
       FROM users u JOIN dogs d ON d.user_id = u.id
       LEFT JOIN user_caregivers uc ON uc.user_id = u.id
       LEFT JOIN caregivers c ON c.id = uc.caregiver_id
       WHERE u.id = $1 LIMIT 1`,
      [userId]
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
      [userId, start, today]
    );
    const walkStats = await this.pool.query(
      `SELECT count(*)::int AS walk_count, COALESCE(sum(distance_meters), 0)::int AS distance_meters,
              max(finished_at) AS latest_walk
       FROM walk_sessions WHERE user_id = $1 AND started_at >= ($2::date::timestamp AT TIME ZONE $4)
         AND started_at < (($3::date + 1)::timestamp AT TIME ZONE $4)`,
      [userId, start, today, person.timezone]
    );
    const latestMetricResult = await this.pool.query(
      "SELECT id::text AS id, systolic, diastolic, note, recorded_at FROM health_metrics WHERE user_id = $1 ORDER BY recorded_at DESC LIMIT 1",
      [userId]
    );
    const momentsResult = await this.pool.query(
      `SELECT id::text AS id, decision, caretaker_ping, created_at
       FROM agent_decisions WHERE user_id = $1 AND created_at >= ($2::date::timestamp AT TIME ZONE $4)
         AND created_at < (($3::date + 1)::timestamp AT TIME ZONE $4)
         AND (decision = 'celebrate' OR caretaker_ping = true)
       ORDER BY created_at DESC LIMIT 20`,
      [userId, start, today, person.timezone]
    );
    const questionsResult = await this.pool.query(
      `SELECT note, recorded_at FROM health_metrics
       WHERE user_id = $1 AND note IS NOT NULL AND note <> ''
         AND recorded_at >= ($2::date::timestamp AT TIME ZONE $4)
         AND recorded_at < (($3::date + 1)::timestamp AT TIME ZONE $4)
       ORDER BY recorded_at DESC LIMIT 10`,
      [userId, start, today, person.timezone]
    );
    const latestDecision = await this.latestDecision(this.pool, userId, now);
    const input = await this.loadInput(this.pool, userId, now);
    const stats = scheduleStats.rows[0];
    const walks = walkStats.rows[0];
    const denominator = stats.doses_due;
    const careScore = denominator === 0 ? 0 : Math.floor(stats.doses_taken / denominator * 100);
    const latestActivity = [walks.latest_walk, latestDecision?.createdAt].filter(Boolean).map((value) => new Date(value)).sort((a, b) => b.getTime() - a.getTime())[0];
    return {
      period: { start, end: today },
      senior: { id: person.user_id, name: person.senior_name },
      caregiver: person.caregiver_id ? { id: person.caregiver_id, name: person.caregiver_name } : null,
      dog: { id: person.dog_id, name: person.dog_name, mood: selectDogMood(input.dog.heart, latestDecision, now), heart: input.dog.heart, streak: input.dog.streak },
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
        kind: row.caretaker_ping ? "check_in" : "celebration",
        message: row.caretaker_ping ? "A gentle check-in may help today." : "A caring moment from the routine.",
        occurredAt: iso(row.created_at)
      })),
      doctorQuestions: questionsResult.rows.map((row) => ({
        note: `Ask a healthcare professional about: ${row.note}`,
        occurredAt: iso(row.recorded_at)
      }))
    };
  }
  async getEscalationSettings() {
    const userId = await this.getDefaultUserId();
    const result = await this.pool.query(
      "SELECT opted_in, threshold FROM user_caregivers WHERE user_id = $1 ORDER BY caregiver_id LIMIT 1",
      [userId]
    );
    if (!result.rows[0]) return { optedIn: false, threshold: DEMO_RULES.defaultCaretakerThreshold };
    return { optedIn: result.rows[0].opted_in, threshold: result.rows[0].threshold };
  }
  async updateEscalationSettings(request) {
    if (request.threshold < DEMO_RULES.caretakerMinimumThreshold) {
      throw new ApiError(400, `Caretaker threshold must be at least ${DEMO_RULES.caretakerMinimumThreshold}.`);
    }
    return this.transaction(async (client) => {
      const userId = await this.getDefaultUserId(client);
      await client.query(
        `UPDATE user_caregivers SET opted_in = $2, threshold = $3
         WHERE user_id = $1`,
        [userId, request.optedIn, request.threshold]
      );
      const result = await client.query(
        "SELECT opted_in, threshold FROM user_caregivers WHERE user_id = $1 ORDER BY caregiver_id LIMIT 1",
        [userId]
      );
      if (!result.rows[0]) throw new ApiError(404, "Caretaker settings not found.");
      return { optedIn: result.rows[0].opted_in, threshold: result.rows[0].threshold };
    });
  }
  async recordWalkSession(request) {
    return this.transaction(async (client) => {
      const userId = await this.getDefaultUserId(client);
      const id = randomUUID();
      const result = await client.query(
        `INSERT INTO walk_sessions (id, user_id, started_at, finished_at, distance_meters, fast_stretch_occurred)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id::text, started_at, finished_at, distance_meters, fast_stretch_occurred`,
        [id, userId, request.startedAt, request.finishedAt, request.distanceMeters, request.fastStretchOccurred]
      );
      const { decision: decision2 } = await this.decideAndPersist(client, userId, request.finishedAt, void 0, { walkFinished: true });
      const row = result.rows[0];
      const cumulativeResult = await client.query(
        "SELECT COALESCE(sum(distance_meters), 0)::int AS total FROM walk_sessions WHERE user_id = $1",
        [userId]
      );
      const cumulative = cumulativeResult.rows[0].total;
      const shouldUnlock = unlockedSouvenirs(cumulative);
      let souvenirId = null;
      if (shouldUnlock.length > 0) {
        for (const key of shouldUnlock) {
          const existing = await client.query(
            "SELECT 1 FROM souvenirs WHERE user_id = $1 AND souvenir_key = $2",
            [userId, key]
          );
          if (!existing.rowCount) {
            const souvenirIdRow = randomUUID();
            await client.query(
              "INSERT INTO souvenirs (id, user_id, souvenir_key, unlocked_at) VALUES ($1, $2, $3, $4)",
              [souvenirIdRow, userId, key, request.finishedAt]
            );
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
        decision: decision2,
        souvenirId
      };
    });
  }
  // ── T2-02 / T2-06: Medication CRUD ──
  async listMedications() {
    const userId = await this.getDefaultUserId();
    const result = await this.pool.query(
      `SELECT id::text, name, strength, dosage_form, route_of_administration,
              active_ingredients, generic_name, prescribed_for, days_of_supply,
              photo_url, active
       FROM medications WHERE user_id = $1 ORDER BY created_at`,
      [userId]
    );
    return { medications: result.rows.map(mapMedication) };
  }
  async createMedication(request) {
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
          id,
          userId,
          request.name.trim(),
          request.strength?.trim() || null,
          request.dosageForm?.trim() || null,
          request.routeOfAdministration?.trim() || null,
          request.activeIngredients?.trim() || null,
          request.genericName?.trim() || null,
          request.prescribedFor?.trim() || null,
          Number.isInteger(request.daysOfSupply) ? request.daysOfSupply : null,
          request.photoUrl?.trim() || null
        ]
      );
      return { medication: mapMedication(result.rows[0]) };
    });
  }
  async updateMedication(medicationId, request) {
    return this.transaction(async (client) => {
      const userId = await this.getDefaultUserId(client);
      const existing = await client.query(
        "SELECT 1 FROM medications WHERE id = $1 AND user_id = $2",
        [medicationId, userId]
      );
      if (!existing.rowCount) throw new ApiError(404, "Medication not found.");
      const fields = [];
      const params = [];
      const fieldMap = {
        name: "name",
        strength: "strength",
        dosageForm: "dosage_form",
        routeOfAdministration: "route_of_administration",
        activeIngredients: "active_ingredients",
        genericName: "generic_name",
        prescribedFor: "prescribed_for",
        daysOfSupply: "days_of_supply",
        photoUrl: "photo_url"
      };
      let paramIndex = 1;
      for (const [key, column] of Object.entries(fieldMap)) {
        if (key in request && request[key] !== void 0) {
          const value = request[key];
          fields.push(`${column} = $${paramIndex++}`);
          params.push(typeof value === "string" ? value.trim() || null : value ?? null);
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
        params
      );
      return { medication: mapMedication(result.rows[0]) };
    });
  }
  async createSchedule(request) {
    return this.transaction(async (client) => {
      const userId = await this.getDefaultUserId(client);
      if (!request.medicationId?.trim()) throw new ApiError(400, "medicationId is required.");
      if (!request.scheduledTime?.trim()) throw new ApiError(400, "scheduledTime is required.");
      if (!request.startsOn?.trim()) throw new ApiError(400, "startsOn is required.");
      if (!/^\d{2}:\d{2}$/.test(request.scheduledTime)) throw new ApiError(400, "scheduledTime must be HH:MM.");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(request.startsOn)) throw new ApiError(400, "startsOn must be YYYY-MM-DD.");
      if (request.endsOn && !/^\d{4}-\d{2}-\d{2}$/.test(request.endsOn)) throw new ApiError(400, "endsOn must be YYYY-MM-DD.");
      const owns = await client.query(
        "SELECT 1 FROM medications WHERE id = $1 AND user_id = $2",
        [request.medicationId, userId]
      );
      if (!owns.rowCount) throw new ApiError(404, "Medication not found for this user.");
      const id = randomUUID();
      const result = await client.query(
        `INSERT INTO med_schedules (id, medication_id, scheduled_time, starts_on, ends_on)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id::text, medication_id::text, scheduled_time::text, starts_on::text, ends_on::text`,
        [id, request.medicationId, request.scheduledTime, request.startsOn, request.endsOn ?? null]
      );
      const row = result.rows[0];
      return {
        schedule: {
          id: row.id,
          medicationId: row.medication_id,
          scheduledTime: row.scheduled_time,
          startsOn: row.starts_on,
          endsOn: row.ends_on
        }
      };
    });
  }
  // ── T2-03: Medicine explanation ──
  async getMedicineExplanation(medicineName) {
    if (!medicineName?.trim()) throw new ApiError(400, "Medicine name is required.");
    const baseInfo = { ...FALLBACK_EXPLANATION, medicineName: medicineName.trim() };
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
              wordingSource: "model"
            };
          }
        }
      } catch {
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
      wordingSource: "fallback"
    };
  }
  async rephraseWithModel(sourceText, medicineName) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3e3);
    try {
      const response = await fetch(`${process.env.LLM_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.LLM_API_KEY}`
        },
        body: JSON.stringify({
          model: process.env.LLM_MODEL ?? "gpt-4o-mini",
          messages: [
            { role: "system", content: "You rephrase trusted medicine information into warm, simple language for seniors. Do not add new numbers, doses, medicine names, or medical advice. Do not diagnose." },
            { role: "user", content: `Rephrase this in one or two short sentences: ${sourceText}` }
          ],
          max_tokens: 150
        }),
        signal: controller.signal
      });
      if (!response.ok) return null;
      const payload = await response.json();
      const text = payload.choices?.[0]?.message?.content?.trim();
      return text || null;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
  // ── T2-09: Souvenirs ──
  async getSouvenirs() {
    const userId = await this.getDefaultUserId();
    const walkResult = await this.pool.query(
      "SELECT COALESCE(sum(distance_meters), 0)::int AS total FROM walk_sessions WHERE user_id = $1",
      [userId]
    );
    const cumulative = walkResult.rows[0].total;
    const unlockedRows = await this.pool.query(
      "SELECT souvenir_key, unlocked_at FROM souvenirs WHERE user_id = $1 ORDER BY unlocked_at",
      [userId]
    );
    const unlockedKeys = new Set(unlockedRows.rows.map((row) => row.souvenir_key));
    const allUnlocked = unlockedSouvenirs(cumulative);
    for (const key of allUnlocked) unlockedKeys.add(key);
    const unlocked = SOUVENIR_TIERS.filter((tier) => unlockedKeys.has(tier.key)).map((tier) => ({ key: tier.key, name: tier.name, note: tier.note }));
    const next = nextSouvenir(cumulative);
    const nextTarget = next ? {
      key: next.key,
      name: next.name,
      note: next.note,
      cumulativeMeters: next.cumulativeMeters,
      progress: cumulative / next.cumulativeMeters
    } : null;
    return { unlocked, nextTarget, cumulativeMeters: cumulative };
  }
  // ── T2-11: Caretaker treats ──
  async getLatestTreat() {
    const userId = await this.getDefaultUserId();
    const result = await this.pool.query(
      `SELECT id::text AS id, message, given_at, seen FROM treats
       WHERE user_id = $1 ORDER BY given_at DESC LIMIT 1`,
      [userId]
    );
    if (!result.rows[0]) return null;
    return {
      id: result.rows[0].id,
      message: result.rows[0].message,
      givenAt: iso(result.rows[0].given_at),
      seen: result.rows[0].seen
    };
  }
  async sendTreat(message) {
    return this.transaction(async (client) => {
      const userId = await this.getDefaultUserId(client);
      const caregiverResult = await client.query(
        "SELECT caregiver_id FROM user_caregivers WHERE user_id = $1 ORDER BY caregiver_id LIMIT 1",
        [userId]
      );
      const id = randomUUID();
      const result = await client.query(
        `INSERT INTO treats (id, user_id, caregiver_id, message)
         VALUES ($1, $2, $3, $4)
         RETURNING id::text AS id, message, given_at, seen`,
        [
          id,
          userId,
          caregiverResult.rows[0]?.caregiver_id ?? null,
          message?.trim() || "A treat from your caretaker!"
        ]
      );
      const row = result.rows[0];
      return {
        id: row.id,
        message: row.message,
        givenAt: iso(row.given_at),
        seen: row.seen
      };
    });
  }
  async markTreatSeen(treatId) {
    return this.transaction(async (client) => {
      const userId = await this.getDefaultUserId(client);
      await client.query(
        "UPDATE treats SET seen = true WHERE id = $1 AND user_id = $2",
        [treatId, userId]
      );
    });
  }
  // ── T2-12: Milestones derived from data ──
  async getMilestones() {
    const userId = await this.getDefaultUserId();
    const identity = await this.pool.query(
      `SELECT u.timezone, d.heart, d.streak
       FROM users u JOIN dogs d ON d.user_id = u.id WHERE u.id = $1`,
      [userId]
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
      [userId]
    );
    const caringDays = caringResult.rows[0]?.caring_days ?? 0;
    const walkResult = await this.pool.query(
      "SELECT count(*)::int AS count, COALESCE(sum(distance_meters), 0)::int AS total FROM walk_sessions WHERE user_id = $1",
      [userId]
    );
    const souvenirResult = await this.pool.query(
      "SELECT souvenir_key FROM souvenirs WHERE user_id = $1 ORDER BY unlocked_at",
      [userId]
    );
    const cumulativeWalk = walkResult.rows[0].total;
    const unlockedKeys = new Set(souvenirResult.rows.map((row) => row.souvenir_key));
    for (const key of unlockedSouvenirs(cumulativeWalk)) unlockedKeys.add(key);
    const unlockedSouvenirsList = SOUVENIR_TIERS.filter((tier) => unlockedKeys.has(tier.key)).map((tier) => ({ key: tier.key, name: tier.name, note: tier.note }));
    const streak = person.streak;
    const trickDefs = [
      { name: "Sit", threshold: 1, milestoneNote: "1 day streak" },
      { name: "High five", threshold: 7, milestoneNote: "7 day streak" },
      { name: "Roll over", threshold: 14, milestoneNote: "14 day streak" },
      { name: "New trick", threshold: 30, milestoneNote: "30 day streak" }
    ];
    const tricks = trickDefs.map((def) => ({
      name: def.name,
      note: streak >= def.threshold ? def.milestoneNote : `${def.threshold - streak} days to go`,
      earned: streak >= def.threshold
    }));
    const worldThresholds = [
      { id: "flat", label: "Our flat", levelText: "WORLD 1", description: "Where it all begins.", threshold: 0 },
      { id: "garden", label: "Garden", levelText: "WORLD 2", description: "Unlocked at 1 km total walking.", threshold: 1e3 },
      { id: "kampung", label: "Kampung", levelText: "WORLD 3", description: "Unlocked at 5 km total walking.", threshold: 5e3 }
    ];
    const currentWorldIdx = worldThresholds.reduce((best, w, idx) => cumulativeWalk >= w.threshold ? idx : best, 0);
    const currentWorld = worldThresholds[currentWorldIdx];
    const nextWorld = worldThresholds[currentWorldIdx + 1];
    const progress = nextWorld ? Math.min(1, cumulativeWalk / nextWorld.threshold) : 1;
    return {
      caringDays,
      streak,
      cumulativeWalkMeters: cumulativeWalk,
      walkCount: walkResult.rows[0].count,
      unlockedSouvenirs: unlockedSouvenirsList,
      nextSouvenirTarget: nextSouvenir(cumulativeWalk) ? (() => {
        const ns = nextSouvenir(cumulativeWalk);
        return { key: ns.key, name: ns.name, note: ns.note, cumulativeMeters: ns.cumulativeMeters, progress: cumulativeWalk / ns.cumulativeMeters };
      })() : null,
      tricks,
      currentWorld: {
        id: currentWorld.id,
        label: currentWorld.label,
        levelText: currentWorld.levelText,
        description: currentWorld.description,
        progress
      }
    };
  }
  // ── T2-08: Pill photo recognition (demo only) ──
  async describePill(request) {
    if (!process.env.LLM_API_KEY || !process.env.LLM_BASE_URL) {
      throw new ApiError(503, "LLM API is not configured. Set LLM_API_KEY and LLM_BASE_URL.");
    }
    const userId = await this.getDefaultUserId();
    const existing = await this.pool.query(
      "SELECT pill_description FROM medications WHERE id = $1 AND user_id = $2",
      [request.medicationId, userId]
    );
    if (!existing.rowCount) throw new ApiError(404, "Medication not found.");
    const description = await this.describePillWithVision(request.imageBase64, request.mimeType);
    if (!description) throw new ApiError(502, "The vision model did not return a description.");
    await this.pool.query(
      "UPDATE medications SET pill_description = $2, pill_described_at = now() WHERE id = $1",
      [request.medicationId, description]
    );
    return {
      medicationId: request.medicationId,
      description,
      isNew: !existing.rows[0].pill_description
    };
  }
  async verifyPill(request) {
    if (!process.env.LLM_API_KEY || !process.env.LLM_BASE_URL) {
      throw new ApiError(503, "LLM API is not configured. Set LLM_API_KEY and LLM_BASE_URL.");
    }
    const userId = await this.getDefaultUserId();
    const result = await this.pool.query(
      "SELECT pill_description FROM medications WHERE id = $1 AND user_id = $2",
      [request.medicationId, userId]
    );
    if (!result.rowCount) throw new ApiError(404, "Medication not found.");
    const savedDescription = result.rows[0].pill_description;
    if (!savedDescription) throw new ApiError(409, "No saved description for this medication. Call /api/pill-describe first.");
    const newDescription = await this.describePillWithVision(request.imageBase64, request.mimeType);
    if (!newDescription) throw new ApiError(502, "The vision model did not return a description.");
    const savedKeywords = new Set(extractKeywords(savedDescription));
    const newKeywords = new Set(extractKeywords(newDescription));
    const intersection = [...newKeywords].filter((k) => savedKeywords.has(k));
    const union = /* @__PURE__ */ new Set([...savedKeywords, ...newKeywords]);
    const similarity = union.size > 0 ? intersection.length / union.size : 0;
    return {
      medicationId: request.medicationId,
      match: similarity >= 0.5,
      savedDescription,
      newDescription,
      similarity
    };
  }
  async describePillWithVision(imageBase64, mimeType) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1e4);
    try {
      const dataUrl = `data:${mimeType};base64,${imageBase64}`;
      const response = await fetch(`${process.env.LLM_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.LLM_API_KEY}`
        },
        body: JSON.stringify({
          model: process.env.LLM_VISION_MODEL ?? process.env.LLM_MODEL ?? "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You describe a pill or medicine in a photo for a medication safety demo. List key visual characteristics: colour, shape, markings, imprint text, size, coating, score line. Be concise (2-3 short sentences). Do not identify the drug or give medical advice."
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Describe the key visual characteristics of the medicine in this photo." },
                { type: "image_url", image_url: { url: dataUrl } }
              ]
            }
          ],
          max_tokens: 200
        }),
        signal: controller.signal
      });
      if (!response.ok) return null;
      const payload = await response.json();
      const text = payload.choices?.[0]?.message?.content?.trim();
      return text || null;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
};
function extractKeywords(text) {
  const stopWords = /* @__PURE__ */ new Set(["the", "a", "an", "is", "are", "with", "and", "of", "to", "in", "on", "it", "this", "that", "pill", "medicine", "tablet", "capsule", "photo"]);
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length >= 3 && !stopWords.has(word));
}

// api/handlers.ts
var json = (body2, status = 200) => Response.json(body2, { status });
async function body(request) {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.");
  }
}
function validDate(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}
function requiredString(value) {
  return typeof value === "string" && value.length > 0;
}
function createApiHandler(repository) {
  return async (request) => {
    try {
      const url = new URL(request.url);
      const now = url.searchParams.get("now") ?? (/* @__PURE__ */ new Date()).toISOString();
      if (!validDate(now)) throw new ApiError(400, "now must be an ISO date.");
      if (request.method === "GET" && url.pathname === "/api/products/search") {
        const query = url.searchParams.get("q") ?? "";
        if (query.length > 120) throw new ApiError(400, "q must be at most 120 characters.");
        return json(await repository.searchRegisteredProducts(query));
      }
      if (request.method === "GET" && url.pathname === "/api/today") return json(await repository.getToday(now));
      if (request.method === "GET" && url.pathname === "/api/caretaker/summary") return json(await repository.getCaretakerSummary(now));
      if (request.method === "GET" && url.pathname === "/api/escalation-settings") return json(await repository.getEscalationSettings());
      if (request.method === "PUT" && url.pathname === "/api/escalation-settings") {
        const data = await body(request);
        if (typeof data.optedIn !== "boolean" || !Number.isInteger(data.threshold)) throw new ApiError(400, "optedIn and an integer threshold are required.");
        return json(await repository.updateEscalationSettings(data));
      }
      if (request.method === "POST" && url.pathname === "/api/dose-event") {
        const data = await body(request);
        if (!requiredString(data.scheduleId) || !validDate(data.scheduledFor) || !validDate(data.occurredAt) || !["taken", "skipped"].includes(data.event)) throw new ApiError(400, "Invalid dose event.");
        return json(await repository.recordDoseEvent(data), 201);
      }
      if (request.method === "POST" && url.pathname === "/api/health-metric") {
        const data = await body(request);
        if (!Number.isInteger(data.systolic) || !Number.isInteger(data.diastolic) || data.systolic <= 0 || data.diastolic <= 0 || !validDate(data.recordedAt)) throw new ApiError(400, "Invalid blood pressure reading.");
        return json(await repository.recordHealthMetric(data), 201);
      }
      if (request.method === "POST" && url.pathname === "/api/agent/decide") {
        const data = await body(request);
        if (!requiredString(data.userId) || !validDate(data.now)) throw new ApiError(400, "userId and ISO now are required.");
        return json({ decision: await repository.decideNow(data.userId, data.now) });
      }
      if (request.method === "POST" && url.pathname === "/api/walk-session") {
        const data = await body(request);
        if (!validDate(data.startedAt) || !validDate(data.finishedAt) || !Number.isFinite(data.distanceMeters) || data.distanceMeters < 0 || typeof data.fastStretchOccurred !== "boolean") throw new ApiError(400, "Invalid walk session.");
        if (Date.parse(data.finishedAt) < Date.parse(data.startedAt)) throw new ApiError(400, "Walk finish must be after its start.");
        return json(await repository.recordWalkSession(data), 201);
      }
      if (request.method === "GET" && url.pathname === "/api/medications") return json(await repository.listMedications());
      if (request.method === "POST" && url.pathname === "/api/medications") {
        const data = await body(request);
        if (!requiredString(data.name)) throw new ApiError(400, "name is required.");
        return json(await repository.createMedication(data), 201);
      }
      if (request.method === "PUT" && url.pathname.startsWith("/api/medications/")) {
        const medicationId = url.pathname.slice("/api/medications/".length);
        if (!requiredString(medicationId)) throw new ApiError(400, "Medication id is required.");
        const data = await body(request);
        return json(await repository.updateMedication(medicationId, data));
      }
      if (request.method === "POST" && url.pathname === "/api/schedules") {
        const data = await body(request);
        if (!requiredString(data.medicationId) || !requiredString(data.scheduledTime) || !requiredString(data.startsOn)) throw new ApiError(400, "medicationId, scheduledTime and startsOn are required.");
        return json(await repository.createSchedule(data), 201);
      }
      if (request.method === "GET" && url.pathname === "/api/medicine-explanation") {
        const name = url.searchParams.get("name") ?? "";
        if (!requiredString(name)) throw new ApiError(400, "name query parameter is required.");
        return json(await repository.getMedicineExplanation(name));
      }
      if (request.method === "GET" && url.pathname === "/api/souvenirs") return json(await repository.getSouvenirs());
      if (request.method === "GET" && url.pathname === "/api/treats/latest") return json(await repository.getLatestTreat());
      if (request.method === "POST" && url.pathname === "/api/treats") {
        const data = await body(request).catch(() => ({}));
        return json(await repository.sendTreat(data.message), 201);
      }
      if (request.method === "POST" && url.pathname.startsWith("/api/treats/") && url.pathname.endsWith("/seen")) {
        const treatId = url.pathname.slice("/api/treats/".length, -"/seen".length);
        if (!requiredString(treatId)) throw new ApiError(400, "Treat id is required.");
        await repository.markTreatSeen(treatId);
        return json({ ok: true });
      }
      if (request.method === "GET" && url.pathname === "/api/milestones") return json(await repository.getMilestones());
      if (request.method === "POST" && url.pathname === "/api/pill-describe") {
        const data = await body(request);
        if (!requiredString(data.medicationId) || !requiredString(data.imageBase64) || !requiredString(data.mimeType)) throw new ApiError(400, "medicationId, imageBase64 and mimeType are required.");
        return json(await repository.describePill(data), 201);
      }
      if (request.method === "POST" && url.pathname === "/api/pill-verify") {
        const data = await body(request);
        if (!requiredString(data.medicationId) || !requiredString(data.imageBase64) || !requiredString(data.mimeType)) throw new ApiError(400, "medicationId, imageBase64 and mimeType are required.");
        return json(await repository.verifyPill(data));
      }
      return json({ error: "Route not found." }, 404);
    } catch (error) {
      if (error instanceof ApiError) return json({ error: error.message }, error.status);
      if (typeof error === "object" && error !== null && "code" in error && error.code === "42P01") {
        return json({ error: "Database schema is not initialized. Run the migration and fictional seed commands." }, 503);
      }
      console.error("API request failed", error instanceof Error ? error.message : "unknown error");
      return json({ error: "Internal server error." }, 500);
    }
  };
}

// functions/api/entry.mjs
import { Pool } from "pg";
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required (set it in the EdgeOne Pages env).");
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
var handler = createApiHandler(new PawtnerRepository(pool));
async function entry_default(request) {
  return handler(request);
}
export {
  entry_default as default
};
