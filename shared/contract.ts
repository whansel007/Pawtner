/**
 * PROVISIONAL: drafted from PRD.md before the Figma screen exports are available.
 * Confirm every screen field against docs/design/ before treating this contract as final.
 */

export type DoseStatus = "upcoming" | "due" | "taken" | "skipped" | "missed";

export type DogMood = "joyful" | "content" | "sleepy" | "attentive";

export type DecisionKind =
  | "nudge"
  | "celebrate"
  | "restock_reminder"
  | "doctor_question"
  | "see_gp_soon"
  | "emergency_995"
  | "stay_quiet";

export type RefusalKind =
  | "double_dose"
  | "change_medication"
  | "reading_reassurance"
  | "diagnosis"
  | "pill_identification"
  | "interaction_advice";

export interface DoseSchedule {
  id: string;
  medicationId: string;
  medicationName: string;
  strength: string | null;
  scheduledAt: string;
}

export interface DoseEvent {
  id: string;
  scheduleId: string;
  scheduledFor: string;
  event: "taken" | "skipped";
  occurredAt: string;
  proofPhotoUrl?: string | null;
}

export interface DerivedDose extends DoseSchedule {
  status: DoseStatus;
  eventAt: string | null;
  /** Number of nudges already sent for this scheduled dose. */
  nudgeCount: number;
  lastNudgeAt: string | null;
}

export interface HealthMetric {
  id: string;
  kind: "blood_pressure";
  systolic: number;
  diastolic: number;
  note: string | null;
  recordedAt: string;
}

export interface AgentInput {
  now: string;
  userId: string;
  dog: { id: string; name: string; heart: number; streak: number };
  doses: DerivedDose[];
  latestDoseEvent?: DoseEvent | null;
  healthMetrics: HealthMetric[];
  daysOfSupplyByMedicationId: Record<string, number | null>;
  /** Days in a row, counting back from yesterday, with at least one scheduled dose not taken (today is not over yet). */
  consecutiveMissedDays: number;
  /** Local date (YYYY-MM-DD) of the most recent of those days, or null when none. */
  lastMissedDay: string | null;
  /** The missed day the latest caretaker check-in was sent for, or null. One check-in per missed day. */
  lastCheckInDay: string | null;
  caretaker: {
    optedIn: boolean;
    threshold: number;
  } | null;
  walkFinished?: boolean;
  streakMilestoneReached?: boolean;
}

export interface AgentDecision {
  id: string;
  decision: DecisionKind;
  ruleId: string;
  mood: DogMood;
  observations: Record<string, string | number | boolean | null>;
  reasoning: string;
  wording: string;
  wordingSource: "template" | "model";
  caretakerPing: boolean;
  refused: boolean;
  refusalKind?: RefusalKind;
  scheduleId?: string;
  scheduledFor?: string;
  createdAt: string;
}

export interface AgentRefusal {
  kind: RefusalKind;
  refused: true;
  message: string;
  decision: AgentDecision;
}

/** The three activities that earn a heart each day (user, 16 Oct). */
export interface HeartActivities {
  /** Every dose scheduled that day is taken (a day with nothing scheduled counts as done). */
  medicines: boolean;
  /** A blood-pressure measurement was logged that day. */
  bloodPressure: boolean;
  /** A walk with the dog was finished that day. */
  walk: boolean;
}

/** The dog as the phone and the caretaker page read it. All numbers are derived on read from the dose ledger and readings. */
export interface DogView {
  id: string;
  name: string;
  mood: DogMood;
  /** Hearts now, 1-4: +1 per activity done, -1 every 12 hours without a new heart (`heartsAt`). */
  heart: number;
  /** Consecutive fully taken days before today (`computeStreak`). */
  streak: number;
  /** Lifetime hearts: the sum of every day's hearts since the first scheduled dose, today included (`computeHeartsTotal`). */
  heartsTotal: number;
}

export interface TodayResponse {
  user: { id: string; name: string };
  dog: DogView;
  doses: DerivedDose[];
  healthMetrics: HealthMetric[];
  bloodPressureLoggedToday: boolean;
  /** Today's three heart activities and whether each is done (`heartActivities`); hearts = start + done. */
  activities: HeartActivities;
  latestDecision: AgentDecision | null;
  /** The person's first blood-pressure reading ever (every reading is compared with it), or null. */
  firstBloodPressure: HealthMetric | null;
}

export interface DoseEventRequest {
  scheduleId: string;
  scheduledFor: string;
  event: "taken" | "skipped";
  occurredAt: string;
  proofPhotoUrl?: string | null;
}

export interface DoseEventResponse {
  event: DoseEvent;
  today: TodayResponse;
  decision: AgentDecision;
}

export interface HealthMetricRequest {
  systolic: number;
  diastolic: number;
  note?: string | null;
  recordedAt: string;
}

export interface HealthMetricResponse {
  metric: HealthMetric;
  decision: AgentDecision;
}

export interface AgentDecideRequest {
  userId: string;
  now: string;
}

export interface AgentDecideResponse {
  decision: AgentDecision;
}

/**
 * Demo only (Settings > For demo only > Reset to morning). `now` is the morning instant to restart at; the API
 * deletes the demo user's dose taps, readings and decisions from the start of that local day on, then decides once at `now`.
 */
export interface DemoResetDayRequest {
  now: string;
}

export interface CaretakerSummaryResponse {
  period: { start: string; end: string };
  senior: { id: string; name: string };
  caregiver: { id: string; name: string } | null;
  dog: DogView;
  careScore: number;
  caringDays: number;
  dosesTaken: number;
  dosesDue: number;
  walkCount: number;
  walkDistanceMeters: number;
  latestActivityAt: string | null;
  latestBloodPressure: HealthMetric | null;
  caringMoments: Array<{ id: string; kind: "celebration" | "check_in"; message: string; occurredAt: string }>;
  doctorQuestions: Array<{ note: string; occurredAt: string }>;
  /**
   * The latest caretaker check-in of the past week (agent rule `repeated_misses_caretaker_check_in`), or null.
   * `lastMissedDay` is the senior's local date; `sentAt` may be later than now when a demo clock ran the agent ahead.
   */
  checkIn: { missedDays: number; lastMissedDay: string; sentAt: string } | null;
  /**
   * The latest stop of a medicine that is still stopped, within the past week (same window as `checkIn`), or null.
   * Never the medicine's name and never a count: /care only says "A medicine is stopped."
   */
  stoppedMedicine: { stoppedAt: string } | null;
  /** This week's refill requests from the senior (each shares its medicine's name, because she asked for help with it). */
  restockRequests: RestockRequest[];
  /** Notes the senior shared with her caretaker (never her private ones), newest first. */
  sharedNotes: SharedNote[];
  /** Buddy's hearts at the end of each of the 7 days before today (the senior's local dates, oldest first). */
  dayHearts: Array<{ date: string; hearts: number }>;
}

export interface EscalationSettingsRequest {
  optedIn: boolean;
  threshold: number;
}

export interface EscalationSettingsResponse {
  optedIn: boolean;
  threshold: number;
}

export interface WalkSessionRequest {
  startedAt: string;
  finishedAt: string;
  distanceMeters: number;
  fastStretchOccurred: boolean;
}

export interface WalkSessionResponse {
  id: string;
  startedAt: string;
  finishedAt: string;
  distanceMeters: number;
  fastStretchOccurred: boolean;
  decision: AgentDecision;
  souvenirId: string | null;
}

// ── T2-02: Medication CRUD ──

export interface MedicationDetail {
  id: string;
  name: string;
  strength: string | null;
  dosageForm: string | null;
  routeOfAdministration: string | null;
  activeIngredients: string | null;
  genericName: string | null;
  prescribedFor: string | null;
  daysOfSupply: number | null;
  photoUrl: string | null;
  active: boolean;
  /** True once the user has set the original pill photo in medicine settings (T2-08). */
  pillReferenceSet: boolean;
}

export interface CreateMedicationRequest {
  name: string;
  strength?: string | null;
  dosageForm?: string | null;
  routeOfAdministration?: string | null;
  activeIngredients?: string | null;
  genericName?: string | null;
  prescribedFor?: string | null;
  daysOfSupply?: number | null;
  photoUrl?: string | null;
}

/**
 * PUT /api/medications/:id. `active: false` stops the medicine (soft: nothing is erased, `stopped_at` is set);
 * `active: true` starts it again and clears `stopped_at`.
 */
export type UpdateMedicationRequest = Partial<CreateMedicationRequest> & { active?: boolean };

export interface CreateMedicationResponse {
  medication: MedicationDetail;
}

export interface CreateScheduleRequest {
  medicationId: string;
  scheduledTime: string;
  startsOn: string;
  endsOn?: string | null;
}

export interface CreateScheduleResponse {
  schedule: { id: string; medicationId: string; scheduledTime: string; startsOn: string; endsOn: string | null };
}

export interface MedicationListResponse {
  medications: MedicationDetail[];
}

// ── T2-03: Medicine explanation ──

export interface MedicineExplanationRequest {
  medicineName: string;
}

export interface MedicineExplanationResponse {
  medicineName: string;
  summary: string;
  points: { label: string; text: string }[];
  spokenText: string;
  sourceCredit: string;
  ndfUrl: string;
  healthHubUrl: string;
  wordingSource: "trusted" | "model" | "fallback";
}

// ── T2-08: Pill photo recognition (demo only) ──
// Comparison is anchored to a SETTINGS-defined "original" picture, not to a previous photo.
// The reference is set once via /api/pill-reference; every check-in compares against it.

export interface PillReferenceRequest {
  /** Medication ID to associate the original/reference photo with. */
  medicationId: string;
  /** Base64-encoded image data (without the data: prefix). */
  imageBase64: string;
  /** MIME type of the image, e.g. "image/jpeg". */
  mimeType: string;
}

export interface PillReferenceResponse {
  medicationId: string;
  /** The LLM-generated visual description of the reference pill. */
  description: string;
  /** Always true — the reference was set. */
  set: boolean;
}

/** GET /api/pill-reference?medicationId=… : the saved original pill photo, to show it again (user, 16 Oct). */
export interface PillReferenceImageResponse {
  medicationId: string;
  /** data: URL of the original photo, as saved by setPillReference. */
  imageDataUrl: string;
  /** ISO time it was set. */
  setAt: string;
}

export interface PillVerifyRequest {
  /** Medication ID whose reference photo to compare against. */
  medicationId: string;
  /** Base64-encoded image data (without the data: prefix). */
  imageBase64: string;
  /** MIME type of the image, e.g. "image/jpeg". */
  mimeType: string;
}

export interface PillVerifyResponse {
  medicationId: string;
  /** Whether the new photo matches the settings-defined reference pill. */
  match: boolean;
  /** The stored description of the reference (original) pill photo. */
  referenceDescription: string | null;
  /** The description generated from this check-in photo. */
  newDescription: string;
  /** Similarity score 0–1 (fraction of matching keywords). */
  similarity: number;
}

export interface PillWarmupResponse {
  ok: boolean;
  /** Whether the vision model responded (reachable and multimodal). */
  warmed: boolean;
}

// ── T2-09: Souvenirs ──

export interface SouvenirResponse {
  unlocked: { key: string; name: string; note: string }[];
  nextTarget: { key: string; name: string; note: string; cumulativeMeters: number; progress: number } | null;
  cumulativeMeters: number;
}

// ── T2-11: Caretaker treats ──

export interface TreatResponse {
  id: string;
  message: string;
  givenAt: string;
  seen: boolean;
}

export interface SendTreatRequest {
  message?: string;
}

// ── T2-12: Milestones derived from data ──

export interface MilestonesResponse {
  caringDays: number;
  streak: number;
  cumulativeWalkMeters: number;
  walkCount: number;
  unlockedSouvenirs: { key: string; name: string; note: string }[];
  nextSouvenirTarget: { key: string; name: string; note: string; cumulativeMeters: number; progress: number } | null;
  tricks: { name: string; note: string; earned: boolean }[];
  currentWorld: { id: string; label: string; levelText: string; description: string; progress: number };
}

// ── /care from any browser (migration 008). Each item has its own id and timestamps, as if it were its own row. ──

/** A refill request: the senior asked her caretaker to help with one medicine. */
export interface RestockRequest {
  id: string;
  medicationId: string;
  /** The medicine to buy (from medications; shared only because she asked for help with it). */
  medicationName: string;
  /** Days of supply left when she asked. */
  daysLeft: number;
  requestedAt: string;
  status: "pending" | "handled";
  /** When a caretaker said they'd handle it; null while pending. */
  handledAt: string | null;
}

/** POST /api/restock-requests. Asking again for the same medicine replaces its pending request. */
export interface CreateRestockRequest {
  medicationId: string;
  daysLeft: number;
  requestedAt: string;
}

export interface RestockRequestListResponse {
  restockRequests: RestockRequest[];
}

/** A note the senior shared with her caretaker; `id` is the phone's note id. */
export interface SharedNote {
  id: string;
  text: string;
  updatedAt: string;
}

/** PUT /api/shared-notes/:id (create or replace). */
export interface SharedNoteRequest {
  text: string;
  updatedAt: string;
}

/** GET / PUT /api/sharing. When false, the caretaker summary has no blood-pressure reading and no reading-based questions. */
export interface SharingSettings {
  shareBloodPressure: boolean;
}

/** GET / PUT /api/demo-clock. GET returns the clock's time NOW (it runs forward from when it was set); null = real time. */
export interface DemoClockState {
  at: string | null;
}
