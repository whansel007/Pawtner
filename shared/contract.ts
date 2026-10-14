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
  consecutiveMissedDoses: number;
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

export interface TodayResponse {
  user: { id: string; name: string };
  dog: { id: string; name: string; mood: DogMood; heart: number; streak: number };
  doses: DerivedDose[];
  healthMetrics: HealthMetric[];
  bloodPressureLoggedToday: boolean;
  latestDecision: AgentDecision | null;
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

export interface CaretakerSummaryResponse {
  period: { start: string; end: string };
  senior: { id: string; name: string };
  caregiver: { id: string; name: string } | null;
  dog: { id: string; name: string; mood: DogMood; heart: number; streak: number };
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
